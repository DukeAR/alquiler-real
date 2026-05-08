[CmdletBinding()]
param(
  [string]$FrontendUrl = 'http://localhost:3000',

  [string]$BackendUrl = '',

  [string]$ApiOrigin = '',

  [string]$GuestEmail = 'lucia@demo.com',

  [string]$GuestPassword = '123456',

  [string]$HostEmail = 'valeria@demo.com',

  [string]$HostPassword = '123456',

  [string]$PropertyId = '',

  [string]$StartDate = '',

  [string]$EndDate = '',

  [int]$Guests = 2,

  [string]$ExistingBookingId = '',

  [string]$ExistingConversationId = '',

  [string]$PaymentId = '',

  [switch]$SkipPayment
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

function Write-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  Write-Host "[protected-flow] $Message"
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

function Resolve-BackendUrl {
  if (-not [string]::IsNullOrWhiteSpace($script:ConfiguredBackendUrl)) {
    return Set-BackendBaseUri -Url $script:ConfiguredBackendUrl
  }

  $frontendUri = [System.Uri]$script:FrontendBaseUrl
  if ($frontendUri.Host -in @('localhost', '127.0.0.1')) {
    return Set-BackendBaseUri -Url $script:FrontendBaseUrl
  }

  $frontendResponse = Invoke-WebRequestSafe -Method 'GET' -Url $script:FrontendBaseUrl -Headers @{ Accept = 'text/html' }
  Assert-Condition ($frontendResponse.StatusCode -eq 200) "El frontend no devolvio 200. Status: $($frontendResponse.StatusCode)"

  $assetMatches = [regex]::Matches($frontendResponse.Content, '/assets/[^"'']+\.js') | ForEach-Object { $_.Value }
  $indexAsset = $assetMatches | Where-Object { $_ -match '/assets/index-.*\.js$' } | Select-Object -First 1
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($indexAsset)) 'No se encontro el bundle index en el HTML del frontend.'

  $assetResponse = Invoke-WebRequestSafe -Method 'GET' -Url ($script:FrontendBaseUrl + $indexAsset) -Headers @{ Accept = 'application/javascript' }
  Assert-Condition ($assetResponse.StatusCode -eq 200) "El bundle index no devolvio 200. Status: $($assetResponse.StatusCode)"

  $frontendHost = $frontendUri.Host
  $candidateAuthorities = [regex]::Matches($assetResponse.Content, 'https:\/\/[A-Za-z0-9.-]+(?::\d+)?') |
    ForEach-Object { $_.Value } |
    Select-Object -Unique |
    Where-Object { ([System.Uri]$_).Host -ne $frontendHost }

  foreach ($candidateAuthority in $candidateAuthorities) {
    $probeResponse = Invoke-WebRequestSafe -Method 'GET' -Url ($candidateAuthority.TrimEnd('/') + '/api/properties?guests=1') -Headers @{
      Origin  = $script:ApiOrigin
      Referer = "$($script:ApiOrigin)/"
      Accept  = 'application/json'
    }

    if ($probeResponse.StatusCode -eq 200) {
      return Set-BackendBaseUri -Url $candidateAuthority
    }
  }

  throw 'No se pudo detectar automaticamente la URL del backend. Pasala con -BackendUrl.'
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

  Assert-Condition ($null -ne $script:BackendBaseUri) 'La URL del backend todavia no fue resuelta.'

  $pathValue = if ($Path.StartsWith('/')) { $Path.Substring(1) } else { $Path }
  $uri = [System.Uri]::new($script:BackendBaseUri, $pathValue)

  return Invoke-WebRequestSafe -Method $Method -Url $uri.AbsoluteUri -Headers @{
    Origin  = $script:ApiOrigin
    Referer = "$($script:ApiOrigin)/"
    Accept  = 'application/json'
  } -Body $Body -Session $Session
}

function New-AuthenticatedSession {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password
  )

  Write-Step "Login $Label"
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $loginResponse = Invoke-BackendApi -Method 'POST' -Path '/api/auth/login' -Session $session -Body @{
    email    = $Email
    password = $Password
  }

  Assert-Condition ($loginResponse.StatusCode -eq 200) "El login de $Label no devolvio 200. Status: $($loginResponse.StatusCode)"
  return $session
}

function Get-BookingSummary {
  param(
    $Booking
  )

  if ($null -eq $Booking) {
    return $null
  }

  return [pscustomobject]@{
    id                    = [string]$Booking.id
    status                = [string]$Booking.status
    requestMode           = [string]$Booking.requestMode
    requestStatus         = [string]$Booking.requestStatus
    depositType           = [string]$Booking.depositType
    depositStatus         = [string]$Booking.depositStatus
    guestCheckinConfirmed = [bool]$Booking.guestCheckinConfirmed
    hostAccessConfirmed   = [bool]$Booking.hostAccessConfirmed
    conversationId        = [string]$Booking.conversationId
    startDate             = [string]$Booking.startDate
    endDate               = [string]$Booking.endDate
  }
}

function Get-GuestBookingById {
  param(
    [Parameter(Mandatory = $true)]
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,

    [Parameter(Mandatory = $true)]
    [string]$BookingId
  )

  $response = Invoke-BackendApi -Method 'GET' -Path '/api/bookings/all' -Session $Session
  Assert-Condition ($response.StatusCode -eq 200) "No pudimos leer bookings/all. Status: $($response.StatusCode)"
  return @($response.Json) | Where-Object { [string]$_.id -eq $BookingId } | Select-Object -First 1
}

function Get-GuestConversation {
  param(
    [Parameter(Mandatory = $true)]
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,

    [string]$ConversationId,

    [string]$BookingId
  )

  $response = Invoke-BackendApi -Method 'GET' -Path '/api/conversations' -Session $Session
  Assert-Condition ($response.StatusCode -eq 200) "No pudimos leer conversaciones del huesped. Status: $($response.StatusCode)"

  $conversations = @($response.Json)
  if (-not [string]::IsNullOrWhiteSpace($ConversationId)) {
    return $conversations | Where-Object { [string]$_.id -eq $ConversationId } | Select-Object -First 1
  }

  return $conversations | Where-Object { [string]$_.booking_id -eq $BookingId } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($StartDate)) {
  $StartDate = (Get-Date).ToString('yyyy-MM-dd')
}

if ([string]::IsNullOrWhiteSpace($EndDate)) {
  $EndDate = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
}

Assert-Condition (-not [string]::IsNullOrWhiteSpace($ExistingBookingId) -or -not [string]::IsNullOrWhiteSpace($PropertyId)) 'Pasá -PropertyId para crear la reserva o -ExistingBookingId para continuar una ya creada.'

$resolvedBackend = Resolve-BackendUrl
Write-Step "Backend resuelto: $resolvedBackend"

$guestSession = New-AuthenticatedSession -Label 'guest' -Email $GuestEmail -Password $GuestPassword
$hostSession = New-AuthenticatedSession -Label 'host' -Email $HostEmail -Password $HostPassword

$property = $null
if (-not [string]::IsNullOrWhiteSpace($PropertyId)) {
  $propertyResponse = Invoke-BackendApi -Method 'GET' -Path "/api/properties/$PropertyId"
  Assert-Condition ($propertyResponse.StatusCode -eq 200) "No pudimos leer la propiedad $PropertyId. Status: $($propertyResponse.StatusCode)"
  $property = $propertyResponse.Json
}

$booking = $null
$conversation = $null

if ([string]::IsNullOrWhiteSpace($ExistingBookingId)) {
  Write-Step 'Crear booking protected'
  $createBookingResponse = Invoke-BackendApi -Method 'POST' -Path '/api/bookings' -Session $guestSession -Body @{
    propertyId  = $PropertyId
    startDate   = $StartDate
    endDate     = $EndDate
    guests      = $Guests
    requestMode = 'protected'
  }

  if ($createBookingResponse.StatusCode -eq 403 -and [string]$createBookingResponse.Json.code -eq 'BOOKING_BLOCKED') {
    Write-Host ($createBookingResponse.Content)
    exit 2
  }

  Assert-Condition ($createBookingResponse.StatusCode -eq 201) "La creacion del booking no devolvio 201. Status: $($createBookingResponse.StatusCode)"
  $booking = $createBookingResponse.Json.booking
} else {
  Write-Step 'Continuar desde un booking existente'
  $booking = Get-GuestBookingById -Session $guestSession -BookingId $ExistingBookingId
  Assert-Condition ($null -ne $booking) "No encontramos el booking $ExistingBookingId en /api/bookings/all."
}

Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$booking.id)) 'El booking no devolvio id.'
Write-Step "Booking listo: $($booking.id)"

$conversation = Get-GuestConversation -Session $guestSession -ConversationId $ExistingConversationId -BookingId ([string]$booking.id)

if ($null -eq $conversation) {
  Write-Step 'Crear o actualizar la conversacion protegida'
  Assert-Condition ($null -ne $property) 'Hace falta -PropertyId para crear la conversacion del booking.'

  $conversationResponse = Invoke-BackendApi -Method 'POST' -Path '/api/conversations' -Session $guestSession -Body @{
    propertyId    = $PropertyId
    bookingId     = [string]$booking.id
    requestMode   = 'protected'
    requestStatus = 'pending'
    startDate     = [string]$booking.startDate
    endDate       = [string]$booking.endDate
    guests        = [int]$booking.guests
    totalPrice    = [int][double]$booking.totalPrice
  }

  Assert-Condition ($conversationResponse.StatusCode -in @(200, 201)) "La conversacion no devolvio 200/201. Status: $($conversationResponse.StatusCode)"
  $conversation = $conversationResponse.Json
}

Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$conversation.id)) 'La conversacion no devolvio id.'
Write-Step "Conversacion lista: $($conversation.id)"

Write-Step 'Aceptar la solicitud desde el host'
$acceptResponse = Invoke-BackendApi -Method 'POST' -Path "/api/conversations/$($conversation.id)/accept-request" -Session $hostSession
Assert-Condition ($acceptResponse.StatusCode -eq 200) "La aceptacion no devolvio 200. Status: $($acceptResponse.StatusCode)"

Write-Step 'Seleccionar seña protegida'
$selectResponse = Invoke-BackendApi -Method 'POST' -Path "/api/bookings/$($booking.id)/select-protected-deposit" -Session $guestSession
Assert-Condition ($selectResponse.StatusCode -eq 200) "La seleccion de seña protegida no devolvio 200. Status: $($selectResponse.StatusCode)"

Write-Step 'Preparar checkout de seña'
$payResponse = Invoke-BackendApi -Method 'POST' -Path "/api/bookings/$($booking.id)/pay-deposit" -Session $guestSession

if ($payResponse.StatusCode -eq 503) {
  Write-Output ([pscustomobject]@{
    stage      = 'pay-deposit'
    partial    = $true
    reason     = [string]$payResponse.Json.code
    message    = [string]$payResponse.Json.message
    booking    = Get-BookingSummary -Booking (Get-GuestBookingById -Session $guestSession -BookingId ([string]$booking.id))
    backendUrl = $resolvedBackend
  } | ConvertTo-Json -Depth 10)
  exit 0
}

Assert-Condition ($payResponse.StatusCode -in @(200, 202)) "El checkout de seña no devolvio 200/202. Status: $($payResponse.StatusCode)"

if ($SkipPayment.IsPresent -or [string]::IsNullOrWhiteSpace($PaymentId)) {
  Write-Output ([pscustomobject]@{
    stage        = 'checkout-ready'
    partial      = $true
    bookingId    = [string]$booking.id
    conversation = [string]$conversation.id
    checkoutUrl  = [string]$payResponse.Json.checkoutUrl
    preferenceId = [string]$payResponse.Json.preferenceId
    booking      = Get-BookingSummary -Booking ($payResponse.Json.booking)
    nextStep     = 'Volvé a ejecutar con -PaymentId para continuar confirm-deposit-payment -> confirm-arrival -> confirm-access.'
    backendUrl   = $resolvedBackend
  } | ConvertTo-Json -Depth 10)
  exit 0
}

Write-Step 'Confirmar pago de seña'
$confirmPaymentResponse = Invoke-BackendApi -Method 'POST' -Path "/api/bookings/$($booking.id)/confirm-deposit-payment" -Session $guestSession -Body @{
  paymentId = $PaymentId
}
Assert-Condition ($confirmPaymentResponse.StatusCode -eq 200) "La confirmacion del pago no devolvio 200. Status: $($confirmPaymentResponse.StatusCode)"

if (-not [bool]$confirmPaymentResponse.Json.confirmed) {
  Write-Output ([pscustomobject]@{
    stage               = 'confirm-deposit-payment'
    partial             = $true
    confirmed           = $false
    paymentStatus       = [string]$confirmPaymentResponse.Json.paymentStatus
    paymentStatusDetail = [string]$confirmPaymentResponse.Json.paymentStatusDetail
    booking             = Get-BookingSummary -Booking ($confirmPaymentResponse.Json.booking)
    backendUrl          = $resolvedBackend
  } | ConvertTo-Json -Depth 10)
  exit 3
}

Write-Step 'Confirmar llegada del huesped'
$arrivalResponse = Invoke-BackendApi -Method 'POST' -Path "/api/bookings/$($booking.id)/confirm-arrival" -Session $guestSession

if ($arrivalResponse.StatusCode -eq 422) {
  Write-Output ([pscustomobject]@{
    stage      = 'confirm-arrival'
    partial    = $true
    reason     = [string]$arrivalResponse.Json.code
    message    = [string]$arrivalResponse.Json.message
    booking    = Get-BookingSummary -Booking ($confirmPaymentResponse.Json.booking)
    backendUrl = $resolvedBackend
  } | ConvertTo-Json -Depth 10)
  exit 0
}

Assert-Condition ($arrivalResponse.StatusCode -eq 200) "La confirmacion de llegada no devolvio 200. Status: $($arrivalResponse.StatusCode)"

Write-Step 'Confirmar acceso desde el host'
$accessResponse = Invoke-BackendApi -Method 'POST' -Path "/api/bookings/$($booking.id)/confirm-access" -Session $hostSession

if ($accessResponse.StatusCode -eq 422) {
  Write-Output ([pscustomobject]@{
    stage      = 'confirm-access'
    partial    = $true
    reason     = [string]$accessResponse.Json.code
    message    = [string]$accessResponse.Json.message
    booking    = Get-BookingSummary -Booking ($arrivalResponse.Json.booking)
    backendUrl = $resolvedBackend
  } | ConvertTo-Json -Depth 10)
  exit 0
}

Assert-Condition ($accessResponse.StatusCode -eq 200) "La confirmacion de acceso no devolvio 200. Status: $($accessResponse.StatusCode)"

$finalBooking = $accessResponse.Json.booking
Assert-Condition ([string]$finalBooking.depositStatus -eq 'released') 'La seña no quedó liberada al final del flujo.'
Assert-Condition ([bool]$finalBooking.guestCheckinConfirmed) 'Falta guestCheckinConfirmed al final del flujo.'
Assert-Condition ([bool]$finalBooking.hostAccessConfirmed) 'Falta hostAccessConfirmed al final del flujo.'

Write-Output ([pscustomobject]@{
  stage      = 'completed'
  partial    = $false
  booking    = Get-BookingSummary -Booking $finalBooking
  backendUrl = $resolvedBackend
} | ConvertTo-Json -Depth 10)