[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,

  [Parameter(Mandatory = $true)]
  [string]$GuestEmail,

  [Parameter(Mandatory = $true)]
  [string]$GuestPassword,

  [Parameter(Mandatory = $true)]
  [string]$InternalOpsSecret,

  [Parameter(Mandatory = $true)]
  [string]$PropertyId,

  [string]$ReportedUserId,

  [ValidateSet('pending_only', 'confirm_low', 'confirm_medium', 'confirm_high')]
  [string]$ReviewAction = 'pending_only',

  [ValidateSet('suspicious_listing', 'false_information', 'off_platform_attempt', 'inappropriate_conduct', 'not_as_listed', 'other')]
  [string]$Reason = 'not_as_listed',

  [string]$ReviewedBy = 'ops_smoke_test',

  [string]$Description = 'Smoke test: las fotos no coinciden con el estado actual del lugar.',

  [switch]$CleanupReport
)

$ErrorActionPreference = 'Stop'

if ($CleanupReport.IsPresent -and $ReviewAction -ne 'pending_only') {
  throw 'CleanupReport solo esta soportado con ReviewAction=pending_only para evitar mutar sanciones ya aplicadas.'
}

$script:Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$script:BaseUri = [System.Uri]::new(($BackendUrl.TrimEnd('/') + '/'))

function Write-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  Write-Host "[moderation-smoke] $Message"
}

function Convert-JsonSafely {
  param(
    [string]$Content
  )

  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }

  try {
    return $Content | ConvertFrom-Json
  }
  catch {
    return $null
  }
}

function Assert-Condition {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,

    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('GET', 'POST')]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [object]$Body,

    [hashtable]$Headers,

    [switch]$UseSession
  )

  $pathValue = if ($Path.StartsWith('/')) { $Path.Substring(1) } else { $Path }
  $uri = [System.Uri]::new($script:BaseUri, $pathValue)
  $requestHeaders = @{}

  if ($Headers) {
    foreach ($key in $Headers.Keys) {
      $requestHeaders[$key] = $Headers[$key]
    }
  }

  $bodyJson = $null
  if ($PSBoundParameters.ContainsKey('Body')) {
    $bodyJson = $Body | ConvertTo-Json -Depth 20 -Compress
    if (-not $requestHeaders.ContainsKey('Content-Type')) {
      $requestHeaders['Content-Type'] = 'application/json'
    }
  }

  $requestParams = @{
    Uri         = $uri
    Method      = $Method
    Headers     = $requestHeaders
    UseBasicParsing = $true
    ErrorAction = 'Stop'
  }

  if ($UseSession.IsPresent) {
    $requestParams['WebSession'] = $script:Session
  }

  if ($null -ne $bodyJson) {
    $requestParams['Body'] = $bodyJson
  }

  try {
    $response = Invoke-WebRequest @requestParams
    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Content    = $response.Content
      Json       = Convert-JsonSafely -Content $response.Content
    }
  }
  catch {
    $rawResponse = $_.Exception.Response
    if ($null -eq $rawResponse) {
      throw
    }

    $reader = New-Object System.IO.StreamReader($rawResponse.GetResponseStream())
    try {
      $content = $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
    }

    return [pscustomobject]@{
      StatusCode = [int]$rawResponse.StatusCode
      Content    = $content
      Json       = Convert-JsonSafely -Content $content
    }
  }
}

function Invoke-CleanupDismiss {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ReportId,

    [Parameter(Mandatory = $true)]
    [string]$CleanupNotes
  )

  $cleanupResponse = Invoke-Api -Method 'POST' -Path "/api/internal/reports/$ReportId/review" -Headers @{
    'x-internal-ops-secret' = $InternalOpsSecret
  } -Body @{
    action     = 'dismiss'
    notes      = $CleanupNotes
    reviewedBy = $ReviewedBy
  }

  Assert-Condition ($cleanupResponse.StatusCode -eq 200) "El cleanup dismiss para $ReportId no devolvio 200. Status: $($cleanupResponse.StatusCode)"
  Assert-Condition ($cleanupResponse.Json.success -eq $true) "El cleanup dismiss para $ReportId no devolvio success=true."
  Assert-Condition ($cleanupResponse.Json.report.status -eq 'dismissed') "El cleanup dismiss para $ReportId no dejo el reporte en status dismissed."

  return $cleanupResponse
}

function Test-PropertyPresence {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Properties,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedPropertyId
  )

  if ($null -eq $Properties) {
    return $false
  }

  foreach ($property in $Properties) {
    if ($null -ne $property -and $property.id -eq $ExpectedPropertyId) {
      return $true
    }
  }

  return $false
}

Write-Step "Login guest"
$loginResponse = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{
  email    = $GuestEmail
  password = $GuestPassword
} -UseSession
Assert-Condition ($loginResponse.StatusCode -eq 200) "El login no devolvio 200. Status: $($loginResponse.StatusCode)"
Assert-Condition ($null -ne $loginResponse.Json.user) 'El login no devolvio user en la respuesta.'

$preCleanupDismissedCount = 0

if ($CleanupReport.IsPresent) {
  Write-Step "Pre-clean pending smoke reports for same property"
  $preCleanupTimestamp = (Get-Date).ToString('s')
  $queuePendingBeforeRun = Invoke-Api -Method 'GET' -Path '/api/internal/moderation/review-queue?status=pending' -Headers @{
    'x-internal-ops-secret' = $InternalOpsSecret
  }
  Assert-Condition ($queuePendingBeforeRun.StatusCode -eq 200) "La cola interna pending antes del smoke no devolvio 200. Status: $($queuePendingBeforeRun.StatusCode)"

  $staleSmokeReports = @(
    $queuePendingBeforeRun.Json.items | Where-Object {
      $itemPropertyId = if ($null -ne $_.property -and $null -ne $_.property.id) { [string]$_.property.id } else { $null }
      $itemDescription = if ($null -ne $_.description) { [string]$_.description } else { '' }
      $itemPropertyId -eq $PropertyId -and $itemDescription.StartsWith($Description)
    }
  )

  foreach ($staleSmokeReport in $staleSmokeReports) {
    Write-Step "Dismiss stale smoke report $($staleSmokeReport.id) before new run"
    Invoke-CleanupDismiss -ReportId ([string]$staleSmokeReport.id) -CleanupNotes "Smoke pre-cleanup dismiss [$preCleanupTimestamp]" | Out-Null
    $preCleanupDismissedCount += 1
  }
}

Write-Step "Fetch public properties before report"
$listBefore = Invoke-Api -Method 'GET' -Path '/api/properties'
Assert-Condition ($listBefore.StatusCode -eq 200) "El listado publico previo no devolvio 200. Status: $($listBefore.StatusCode)"
Assert-Condition (Test-PropertyPresence -Properties $listBefore.Json -ExpectedPropertyId $PropertyId) "La propiedad $PropertyId no aparece en el listado publico previo."

Write-Step "Fetch public property detail before report"
$detailBefore = Invoke-Api -Method 'GET' -Path "/api/properties/$PropertyId"
Assert-Condition ($detailBefore.StatusCode -eq 200) "El detalle publico previo no devolvio 200. Status: $($detailBefore.StatusCode)"

$timestamp = (Get-Date).ToString('s')
$reportDescription = "$Description [$timestamp]"

Write-Step "Create report"
$reportBody = @{
  property_id  = $PropertyId
  reason       = $Reason
  description  = $reportDescription
}

if (-not [string]::IsNullOrWhiteSpace($ReportedUserId)) {
  $reportBody['reported_user_id'] = $ReportedUserId
}

$reportResponse = Invoke-Api -Method 'POST' -Path '/api/reports' -Body $reportBody -UseSession
Assert-Condition ($reportResponse.StatusCode -eq 201) "El reporte no devolvio 201. Status: $($reportResponse.StatusCode)"
Assert-Condition ($null -ne $reportResponse.Json.report.id) 'El reporte no devolvio report.id.'
$reportId = [string]$reportResponse.Json.report.id

Write-Step "Check pending moderation queue"
$queuePending = Invoke-Api -Method 'GET' -Path '/api/internal/moderation/review-queue?status=pending' -Headers @{
  'x-internal-ops-secret' = $InternalOpsSecret
}
Assert-Condition ($queuePending.StatusCode -eq 200) "La cola interna pending no devolvio 200. Status: $($queuePending.StatusCode)"
$queueItem = $queuePending.Json.items | Where-Object { $_.id -eq $reportId } | Select-Object -First 1
Assert-Condition ($null -ne $queueItem) "El reporte $reportId no aparece en la cola interna pending."

Write-Step "Recheck public detail while report is still pending"
$detailPending = Invoke-Api -Method 'GET' -Path "/api/properties/$PropertyId"
Assert-Condition ($detailPending.StatusCode -eq 200) "La propiedad dejo de ser visible antes de la revision manual. Status: $($detailPending.StatusCode)"

if ($ReviewAction -eq 'pending_only') {
  $cleanupFinalStatus = $null

  if ($CleanupReport.IsPresent) {
    Write-Step "Dismiss report for cleanup"
    Invoke-CleanupDismiss -ReportId $reportId -CleanupNotes "Smoke test cleanup dismiss [$timestamp]" | Out-Null

    Write-Step "Verify report leaves pending queue after cleanup"
    $queuePendingAfterCleanup = Invoke-Api -Method 'GET' -Path '/api/internal/moderation/review-queue?status=pending' -Headers @{
      'x-internal-ops-secret' = $InternalOpsSecret
    }
    Assert-Condition ($queuePendingAfterCleanup.StatusCode -eq 200) "La cola interna pending luego del cleanup no devolvio 200. Status: $($queuePendingAfterCleanup.StatusCode)"
    $pendingQueueItemAfterCleanup = $queuePendingAfterCleanup.Json.items | Where-Object { $_.id -eq $reportId } | Select-Object -First 1
    Assert-Condition ($null -eq $pendingQueueItemAfterCleanup) "El reporte $reportId sigue en la cola pending despues del cleanup."

    Write-Step "Verify final report status after cleanup"
    $queueAllAfterCleanup = Invoke-Api -Method 'GET' -Path '/api/internal/moderation/review-queue?status=all' -Headers @{
      'x-internal-ops-secret' = $InternalOpsSecret
    }
    Assert-Condition ($queueAllAfterCleanup.StatusCode -eq 200) "La cola interna all luego del cleanup no devolvio 200. Status: $($queueAllAfterCleanup.StatusCode)"
    $cleanupQueueItem = $queueAllAfterCleanup.Json.items | Where-Object { $_.id -eq $reportId } | Select-Object -First 1
    Assert-Condition ($null -ne $cleanupQueueItem) "El reporte $reportId no aparece en la cola all despues del cleanup."
    Assert-Condition ($cleanupQueueItem.status -eq 'dismissed') "El reporte $reportId no quedo dismissed despues del cleanup. Status: $($cleanupQueueItem.status)"
    $cleanupFinalStatus = $cleanupQueueItem.status

    Write-Step "Recheck public detail after cleanup"
    $detailAfterCleanup = Invoke-Api -Method 'GET' -Path "/api/properties/$PropertyId"
    Assert-Condition ($detailAfterCleanup.StatusCode -eq 200) "La propiedad dejo de ser visible despues del cleanup. Status: $($detailAfterCleanup.StatusCode)"
  }

  Write-Step "Smoke test pending_only completed"
  [pscustomobject]@{
    reviewAction        = $ReviewAction
    reportId            = $reportId
    propertyId          = $PropertyId
    pendingQueueStatus  = $queueItem.status
    reporterWeight      = $queueItem.reporterWeight
    propertyVisible     = $true
    preCleanupDismissed = $preCleanupDismissedCount
    cleanupApplied      = $CleanupReport.IsPresent
    cleanupFinalStatus  = $cleanupFinalStatus
  } | ConvertTo-Json -Depth 6
  exit 0
}

Write-Step "Apply internal review action $ReviewAction"
$reviewResponse = Invoke-Api -Method 'POST' -Path "/api/internal/reports/$reportId/review" -Headers @{
  'x-internal-ops-secret' = $InternalOpsSecret
} -Body @{
  action     = $ReviewAction
  notes      = "Smoke test $ReviewAction [$timestamp]"
  reviewedBy = $ReviewedBy
}
Assert-Condition ($reviewResponse.StatusCode -eq 200) "La revision interna no devolvio 200. Status: $($reviewResponse.StatusCode)"
Assert-Condition ($reviewResponse.Json.success -eq $true) 'La revision interna no devolvio success=true.'

Write-Step "Check review queue with all statuses"
$queueAll = Invoke-Api -Method 'GET' -Path '/api/internal/moderation/review-queue?status=all' -Headers @{
  'x-internal-ops-secret' = $InternalOpsSecret
}
Assert-Condition ($queueAll.StatusCode -eq 200) "La cola interna all no devolvio 200. Status: $($queueAll.StatusCode)"
$finalQueueItem = $queueAll.Json.items | Where-Object { $_.id -eq $reportId } | Select-Object -First 1
Assert-Condition ($null -ne $finalQueueItem) "El reporte $reportId no aparece en la cola interna all."

Write-Step "Fetch public property detail after review"
$detailAfter = Invoke-Api -Method 'GET' -Path "/api/properties/$PropertyId"

Write-Step "Fetch public properties after review"
$listAfter = Invoke-Api -Method 'GET' -Path '/api/properties'
Assert-Condition ($listAfter.StatusCode -eq 200) "El listado publico posterior no devolvio 200. Status: $($listAfter.StatusCode)"
$propertyPresentAfter = Test-PropertyPresence -Properties $listAfter.Json -ExpectedPropertyId $PropertyId

switch ($ReviewAction) {
  'confirm_low' {
    Assert-Condition ($detailAfter.StatusCode -eq 200) "Con confirm_low el detalle deberia seguir visible. Status: $($detailAfter.StatusCode)"
    Assert-Condition ($propertyPresentAfter) 'Con confirm_low la propiedad deberia seguir apareciendo en el listado publico.'
  }
  'confirm_medium' {
    Assert-Condition ($detailAfter.StatusCode -eq 404) "Con confirm_medium el detalle deberia pasar a 404. Status: $($detailAfter.StatusCode)"
    Assert-Condition (-not $propertyPresentAfter) 'Con confirm_medium la propiedad no deberia aparecer en el listado publico.'
  }
  'confirm_high' {
    Assert-Condition ($detailAfter.StatusCode -eq 404) "Con confirm_high el detalle deberia pasar a 404. Status: $($detailAfter.StatusCode)"
    Assert-Condition (-not $propertyPresentAfter) 'Con confirm_high la propiedad no deberia aparecer en el listado publico.'
  }
}

Write-Step "Smoke test completed"
[pscustomobject]@{
  reviewAction            = $ReviewAction
  reportId                = $reportId
  propertyId              = $PropertyId
  reportStatus            = $reviewResponse.Json.report.status
  strikeDelta             = $reviewResponse.Json.report.strikeDelta
  userModerationStatus    = $reviewResponse.Json.user.moderationStatus
  propertyModeration      = if ($null -ne $reviewResponse.Json.property) { $reviewResponse.Json.property.moderationStatus } else { $null }
  detailStatusAfterReview = $detailAfter.StatusCode
  propertyVisibleAfter    = $propertyPresentAfter
} | ConvertTo-Json -Depth 6