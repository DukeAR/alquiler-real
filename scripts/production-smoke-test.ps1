[CmdletBinding()]
param(
  [string]$FrontendUrl = 'https://alquiler-real.vercel.app',

  [string]$BackendUrl = '',

  [string]$ApiOrigin = '',

  [string]$GuestEmail = 'lucia@demo.com',

  [string]$GuestPassword = '123456',

  [string]$HostEmail = 'valeria@demo.com',

  [string]$HostPassword = '123456',

  [int]$MinPropertiesCount = 1
)

$ErrorActionPreference = 'Stop'

$script:FrontendBaseUrl = $FrontendUrl.TrimEnd('/')
$script:ConfiguredBackendUrl = $BackendUrl.Trim()
$script:ApiOrigin = if ([string]::IsNullOrWhiteSpace($ApiOrigin)) {
  $script:FrontendBaseUrl
} else {
  $ApiOrigin.TrimEnd('/')
}
$script:BackendBaseUri = $null
$script:Results = New-Object System.Collections.Generic.List[object]

function Write-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  Write-Host "[production-smoke] $Message"
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

function Set-BackendBaseUri {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  $normalizedUrl = $Url.Trim().TrimEnd('/')
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($normalizedUrl)) 'La URL del backend no puede quedar vacia.'
  $script:BackendBaseUri = [System.Uri]::new(($normalizedUrl + '/'))
  return $normalizedUrl
}

function Resolve-BackendUrlFromBundle {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AssetContent
  )

  if (-not [string]::IsNullOrWhiteSpace($script:ConfiguredBackendUrl)) {
    return Set-BackendBaseUri -Url $script:ConfiguredBackendUrl
  }

  $frontendHost = ([System.Uri]$script:FrontendBaseUrl).Host
  $ignoredHosts = @(
    'images.unsplash.com',
    'avatars.githubusercontent.com',
    'github.com',
    'api.github.com',
    'raw.githubusercontent.com'
  )

  $candidateAuthorities = [regex]::Matches($AssetContent, 'https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~!$&()*+,;=:@%\/-]*)?') |
    ForEach-Object { $_.Value } |
    ForEach-Object {
      try {
        [System.Uri]::new($_)
      }
      catch {
        $null
      }
    } |
    Where-Object { $_ -and $_.Host -ne $frontendHost -and -not ($ignoredHosts -contains $_.Host) } |
    ForEach-Object { $_.GetLeftPart([System.UriPartial]::Authority).TrimEnd('/') } |
    Select-Object -Unique

  foreach ($candidateAuthority in $candidateAuthorities) {
    $probeResponse = Invoke-WebRequestSafe -Method 'GET' -Url ($candidateAuthority + '/api/properties?guests=1') -Headers @{
      Origin  = $script:ApiOrigin
      Referer = "$($script:ApiOrigin)/"
      Accept  = 'application/json'
    }

    if ($probeResponse.StatusCode -eq 200 -and (Get-JsonCount $probeResponse.Json) -ge 1) {
      return Set-BackendBaseUri -Url $candidateAuthority
    }
  }

  throw 'No se pudo detectar automaticamente la URL del backend desde el bundle del frontend. Pasala con -BackendUrl.'
}

function Get-JsonCount {
  param(
    $Value
  )

  if ($null -eq $Value) {
    return 0
  }

  if ($Value -is [System.Array]) {
    return $Value.Count
  }

  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    return @($Value).Count
  }

  return 1
}

function Add-CheckResult {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Check,

    [Parameter(Mandatory = $true)]
    [int]$Status,

    [Parameter(Mandatory = $true)]
    [string]$Detail,

    [string]$AllowOrigin = '',

    [string]$AllowCredentials = ''
  )

  $script:Results.Add([pscustomobject]@{
    Check            = $Check
    Status           = $Status
    AllowOrigin      = $AllowOrigin
    AllowCredentials = $AllowCredentials
    Detail           = $Detail
  }) | Out-Null
}

function Invoke-WebRequestSafe {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('GET', 'POST')]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Url,

    [hashtable]$Headers,

    [object]$Body,

    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )

  $requestHeaders = @{}

  if ($Headers) {
    foreach ($key in $Headers.Keys) {
      $requestHeaders[$key] = $Headers[$key]
    }
  }

  $requestParams = @{
    Uri             = $Url
    Method          = $Method
    Headers         = $requestHeaders
    UseBasicParsing = $true
    ErrorAction     = 'Stop'
  }

  if ($null -ne $Session) {
    $requestParams['WebSession'] = $Session
  }

  if ($PSBoundParameters.ContainsKey('Body')) {
    $requestParams['ContentType'] = 'application/json'
    $requestParams['Body'] = $Body | ConvertTo-Json -Depth 20 -Compress
  }

  try {
    $response = Invoke-WebRequest @requestParams
    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Headers    = $response.Headers
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
      Headers    = $rawResponse.Headers
      Content    = $content
      Json       = Convert-JsonSafely -Content $content
    }
  }
}

function Invoke-BackendApi {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('GET', 'POST')]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [object]$Body,

    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )

  Assert-Condition ($null -ne $script:BackendBaseUri) 'La URL del backend todavia no fue resuelta. Ejecuta primero el chequeo del frontend o pasa -BackendUrl.'

  $pathValue = if ($Path.StartsWith('/')) { $Path.Substring(1) } else { $Path }
  $uri = [System.Uri]::new($script:BackendBaseUri, $pathValue)

  return Invoke-WebRequestSafe -Method $Method -Url $uri.AbsoluteUri -Headers @{
    Origin  = $script:ApiOrigin
    Referer = "$($script:ApiOrigin)/"
    Accept  = 'application/json'
  } -Body $Body -Session $Session
}

function Assert-CorsHeaders {
  param(
    [Parameter(Mandatory = $true)]
    $Response,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedOrigin,

    [switch]$ExpectCredentials
  )

  $allowOrigin = [string]$Response.Headers['Access-Control-Allow-Origin']
  Assert-Condition ($allowOrigin -eq $ExpectedOrigin) "CORS allow-origin inesperado. Esperado: $ExpectedOrigin. Actual: $allowOrigin"

  if ($ExpectCredentials.IsPresent) {
    $allowCredentials = [string]$Response.Headers['Access-Control-Allow-Credentials']
    Assert-Condition ($allowCredentials -eq 'true') "CORS allow-credentials inesperado. Esperado: true. Actual: $allowCredentials"
  }
}

function Test-Frontend {
  Write-Step 'Check target frontend HTML and resolve bundled backend URL'
  $frontendResponse = Invoke-WebRequestSafe -Method 'GET' -Url $script:FrontendBaseUrl -Headers @{ Accept = 'text/html' }

  Assert-Condition ($frontendResponse.StatusCode -eq 200) "El frontend no devolvio 200. Status: $($frontendResponse.StatusCode)"

  $assetMatches = [regex]::Matches($frontendResponse.Content, '/assets/[^"'']+\.js') | ForEach-Object { $_.Value }
  $indexAsset = $assetMatches | Where-Object { $_ -match '/assets/index-.*\.js$' } | Select-Object -First 1
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($indexAsset)) 'No se encontro el bundle index en el HTML del frontend.'

  $assetResponse = Invoke-WebRequestSafe -Method 'GET' -Url ($script:FrontendBaseUrl + $indexAsset) -Headers @{ Accept = 'application/javascript' }
  Assert-Condition ($assetResponse.StatusCode -eq 200) "El bundle index no devolvio 200. Status: $($assetResponse.StatusCode)"
  $resolvedBackendUrl = Resolve-BackendUrlFromBundle -AssetContent $assetResponse.Content
  Assert-Condition ($assetResponse.Content.Contains($resolvedBackendUrl)) 'El bundle live no contiene la URL publica esperada del backend.'

  Add-CheckResult -Check 'frontend html' -Status $frontendResponse.StatusCode -Detail $indexAsset
  Add-CheckResult -Check 'frontend backend target' -Status $assetResponse.StatusCode -Detail $resolvedBackendUrl
}

function Test-PublicApi {
  Write-Step 'Check public catalog, detail, availability and reviews with configured API origin'
  $propertiesResponse = Invoke-BackendApi -Method 'GET' -Path '/api/properties?guests=1'
  Assert-Condition ($propertiesResponse.StatusCode -eq 200) "El catalogo publico no devolvio 200. Status: $($propertiesResponse.StatusCode)"
  Assert-CorsHeaders -Response $propertiesResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials

  $properties = @($propertiesResponse.Json)
  Assert-Condition ($properties.Count -ge $MinPropertiesCount) "El catalogo publico devolvio menos propiedades que el minimo esperado. Count: $($properties.Count)"
  $propertyId = [string]$properties[0].id
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($propertyId)) 'El catalogo publico no devolvio un id de propiedad valido.'
  Add-CheckResult -Check 'public properties' -Status $propertiesResponse.StatusCode -AllowOrigin ([string]$propertiesResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$propertiesResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$($properties.Count) properties"

  $detailResponse = Invoke-BackendApi -Method 'GET' -Path "/api/properties/$propertyId"
  Assert-Condition ($detailResponse.StatusCode -eq 200) "El detalle publico no devolvio 200. Status: $($detailResponse.StatusCode)"
  Assert-CorsHeaders -Response $detailResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  Add-CheckResult -Check 'public property detail' -Status $detailResponse.StatusCode -AllowOrigin ([string]$detailResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$detailResponse.Headers['Access-Control-Allow-Credentials']) -Detail $propertyId

  $availabilityResponse = Invoke-BackendApi -Method 'GET' -Path "/api/properties/$propertyId/availability"
  Assert-Condition ($availabilityResponse.StatusCode -eq 200) "La disponibilidad publica no devolvio 200. Status: $($availabilityResponse.StatusCode)"
  Assert-CorsHeaders -Response $availabilityResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  Add-CheckResult -Check 'public property availability' -Status $availabilityResponse.StatusCode -AllowOrigin ([string]$availabilityResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$availabilityResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $availabilityResponse.Json) entries"

  $reviewsResponse = Invoke-BackendApi -Method 'GET' -Path "/api/properties/$propertyId/reviews"
  Assert-Condition ($reviewsResponse.StatusCode -eq 200) "Las reviews publicas no devolvieron 200. Status: $($reviewsResponse.StatusCode)"
  Assert-CorsHeaders -Response $reviewsResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  Add-CheckResult -Check 'public property reviews' -Status $reviewsResponse.StatusCode -AllowOrigin ([string]$reviewsResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$reviewsResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $reviewsResponse.Json) reviews"
}

function Test-AuthenticatedReadFlow {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [switch]$CheckFavorites,

    [switch]$CheckBookings
  )

  Write-Step "Check authenticated read flow for $Label"
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  $loginResponse = Invoke-BackendApi -Method 'POST' -Path '/api/auth/login' -Session $session -Body @{
    email    = $Email
    password = $Password
  }
  Assert-Condition ($loginResponse.StatusCode -eq 200) "El login de $Label no devolvio 200. Status: $($loginResponse.StatusCode)"
  Assert-CorsHeaders -Response $loginResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  Assert-Condition ($null -ne $loginResponse.Json.user) "El login de $Label no devolvio user."
  Add-CheckResult -Check "$Label login" -Status $loginResponse.StatusCode -AllowOrigin ([string]$loginResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$loginResponse.Headers['Access-Control-Allow-Credentials']) -Detail ([string]$loginResponse.Json.user.email)

  $meResponse = Invoke-BackendApi -Method 'GET' -Path '/api/auth/me' -Session $session
  Assert-Condition ($meResponse.StatusCode -eq 200) "El auth/me de $Label no devolvio 200. Status: $($meResponse.StatusCode)"
  Assert-CorsHeaders -Response $meResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  Assert-Condition ([string]$meResponse.Json.user.email -eq $Email) "El auth/me de $Label devolvio un email inesperado."
  Add-CheckResult -Check "$Label auth/me" -Status $meResponse.StatusCode -AllowOrigin ([string]$meResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$meResponse.Headers['Access-Control-Allow-Credentials']) -Detail ([string]$meResponse.Json.user.email)

  if ($CheckFavorites.IsPresent) {
    $favoritesResponse = Invoke-BackendApi -Method 'GET' -Path '/api/favorites' -Session $session
    Assert-Condition ($favoritesResponse.StatusCode -eq 200) "Los favoritos de $Label no devolvieron 200. Status: $($favoritesResponse.StatusCode)"
    Assert-CorsHeaders -Response $favoritesResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
    Add-CheckResult -Check "$Label favorites" -Status $favoritesResponse.StatusCode -AllowOrigin ([string]$favoritesResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$favoritesResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $favoritesResponse.Json) favorites"
  }

  if ($CheckBookings.IsPresent) {
    $bookingsAllResponse = Invoke-BackendApi -Method 'GET' -Path '/api/bookings/all' -Session $session
    Assert-Condition ($bookingsAllResponse.StatusCode -eq 200) "El bookings/all de $Label no devolvio 200. Status: $($bookingsAllResponse.StatusCode)"
    Assert-CorsHeaders -Response $bookingsAllResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
    Add-CheckResult -Check "$Label bookings all" -Status $bookingsAllResponse.StatusCode -AllowOrigin ([string]$bookingsAllResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$bookingsAllResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $bookingsAllResponse.Json) bookings"

    $bookingsResponse = Invoke-BackendApi -Method 'GET' -Path '/api/bookings' -Session $session
    Assert-Condition ($bookingsResponse.StatusCode -eq 200) "El bookings de $Label no devolvio 200. Status: $($bookingsResponse.StatusCode)"
    Assert-CorsHeaders -Response $bookingsResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
    Add-CheckResult -Check "$Label bookings" -Status $bookingsResponse.StatusCode -AllowOrigin ([string]$bookingsResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$bookingsResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $bookingsResponse.Json) bookings"
  }

  $conversationsResponse = Invoke-BackendApi -Method 'GET' -Path '/api/conversations' -Session $session
  Assert-Condition ($conversationsResponse.StatusCode -eq 200) "Las conversaciones de $Label no devolvieron 200. Status: $($conversationsResponse.StatusCode)"
  Assert-CorsHeaders -Response $conversationsResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
  $conversations = @($conversationsResponse.Json)
  Add-CheckResult -Check "$Label conversations" -Status $conversationsResponse.StatusCode -AllowOrigin ([string]$conversationsResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$conversationsResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $conversations) conversations"

  if ($conversations.Count -gt 0) {
    $conversationId = [string]$conversations[0].id
    Assert-Condition (-not [string]::IsNullOrWhiteSpace($conversationId)) "La primera conversacion de $Label no tiene id valido."

    $messagesResponse = Invoke-BackendApi -Method 'GET' -Path "/api/conversations/$conversationId/messages" -Session $session
    Assert-Condition ($messagesResponse.StatusCode -eq 200) "Los mensajes de $Label no devolvieron 200. Status: $($messagesResponse.StatusCode)"
    Assert-CorsHeaders -Response $messagesResponse -ExpectedOrigin $script:ApiOrigin -ExpectCredentials
    Add-CheckResult -Check "$Label conversation messages" -Status $messagesResponse.StatusCode -AllowOrigin ([string]$messagesResponse.Headers['Access-Control-Allow-Origin']) -AllowCredentials ([string]$messagesResponse.Headers['Access-Control-Allow-Credentials']) -Detail "$(Get-JsonCount $messagesResponse.Json) messages"
  }
}

Test-Frontend
Test-PublicApi
Test-AuthenticatedReadFlow -Label 'guest' -Email $GuestEmail -Password $GuestPassword -CheckFavorites -CheckBookings
Test-AuthenticatedReadFlow -Label 'host' -Email $HostEmail -Password $HostPassword -CheckBookings

Write-Host "[production-smoke] All checks passed"
$script:Results | Format-Table -AutoSize | Out-String -Width 220