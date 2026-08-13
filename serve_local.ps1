param(
  [int]$PreferredPort = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = [IO.Path]::GetFullPath($PSScriptRoot)
$Required = @(
  "index.html",
  "vendor\three\package.json",
  "vendor\three\build\three.module.js",
  "vendor\three\build\three.core.js",
  "vendor\three\examples\jsm\objects\Water.js",
  "vendor\three\examples\jsm\postprocessing\EffectComposer.js"
)

foreach ($Relative in $Required) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $Relative) -PathType Leaf)) {
    Write-Host "[ERROR] Missing required game file: $Relative" -ForegroundColor Red
    Write-Host "Download a fresh ZIP from GitHub Releases and extract every file."
    exit 2
  }
}

$Package = Get-Content -LiteralPath (Join-Path $Root "vendor\three\package.json") -Raw | ConvertFrom-Json
if ($Package.name -ne "three" -or $Package.version -ne "0.185.0") {
  Write-Host "[ERROR] The bundled Three.js runtime is incomplete or the wrong version." -ForegroundColor Red
  exit 2
}

function Get-MimeType([string]$Path) {
  switch -Regex ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    "^\.html?$" { "text/html; charset=utf-8"; break }
    "^\.m?js$" { "text/javascript; charset=utf-8"; break }
    "^\.css$" { "text/css; charset=utf-8"; break }
    "^\.json$" { "application/json; charset=utf-8"; break }
    "^\.svg$" { "image/svg+xml"; break }
    "^\.png$" { "image/png"; break }
    "^\.jpe?g$" { "image/jpeg"; break }
    "^\.webp$" { "image/webp"; break }
    "^\.gif$" { "image/gif"; break }
    "^\.glb$" { "model/gltf-binary"; break }
    "^\.gltf$" { "model/gltf+json"; break }
    "^\.wasm$" { "application/wasm"; break }
    "^\.ktx2$" { "image/ktx2"; break }
    "^\.mp3$" { "audio/mpeg"; break }
    "^\.ogg$" { "audio/ogg"; break }
    "^\.wav$" { "audio/wav"; break }
    default { "application/octet-stream" }
  }
}

function Write-Response(
  [IO.Stream]$Stream,
  [int]$Code,
  [string]$Reason,
  [byte[]]$Body,
  [string]$Mime,
  [bool]$HeadOnly = $false
) {
  $Header = "HTTP/1.1 $Code $Reason`r`n" +
    "Content-Type: $Mime`r`n" +
    "Content-Length: $($Body.Length)`r`n" +
    "Cache-Control: no-store, no-cache, must-revalidate, max-age=0`r`n" +
    "Pragma: no-cache`r`n" +
    "Cross-Origin-Resource-Policy: same-origin`r`n" +
    "Connection: close`r`n`r`n"
  $HeaderBytes = [Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

$Listener = $null
$Port = 0
for ($Candidate = $PreferredPort; $Candidate -le ($PreferredPort + 10); $Candidate++) {
  $Attempt = $null
  try {
    $Attempt = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Candidate)
    $Attempt.Start()
    $Listener = $Attempt
    $Port = $Candidate
    break
  } catch {
    if ($Attempt) { $Attempt.Stop() }
  }
}

if (-not $Listener) {
  Write-Host "[ERROR] No free local port was found from $PreferredPort to $($PreferredPort + 10)." -ForegroundColor Red
  exit 3
}

$Url = "http://127.0.0.1:$Port/?v=1802"
Write-Host "[OK] Three.js 0.185.0 verified locally." -ForegroundColor Green
Write-Host "[OK] Tidal Racer is running at $Url" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window to stop."
if (-not $NoBrowser) { Start-Process $Url }

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    $Reader = $null
    try {
      $Client.ReceiveTimeout = 5000
      $Client.SendTimeout = 30000
      $Stream = $Client.GetStream()
      $Reader = [IO.StreamReader]::new($Stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $RequestLine = $Reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($RequestLine)) { continue }
      while ($true) {
        $Line = $Reader.ReadLine()
        if ([string]::IsNullOrEmpty($Line)) { break }
      }

      $Parts = $RequestLine.Split(" ")
      if ($Parts.Length -lt 2 -or ($Parts[0] -ne "GET" -and $Parts[0] -ne "HEAD")) {
        $Body = [Text.Encoding]::UTF8.GetBytes("Method not allowed")
        Write-Response $Stream 405 "Method Not Allowed" $Body "text/plain; charset=utf-8"
        continue
      }

      $RequestPath = [Uri]::UnescapeDataString(($Parts[1] -split "\?")[0])
      if ($RequestPath -eq "/") { $RequestPath = "/index.html" }
      $Relative = $RequestPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
      $FilePath = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
      if (-not $FilePath.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
        $Body = [Text.Encoding]::UTF8.GetBytes("Forbidden")
        Write-Response $Stream 403 "Forbidden" $Body "text/plain; charset=utf-8"
        continue
      }

      if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        $Body = [Text.Encoding]::UTF8.GetBytes("Not found")
        Write-Response $Stream 404 "Not Found" $Body "text/plain; charset=utf-8"
        continue
      }

      $Body = [IO.File]::ReadAllBytes($FilePath)
      Write-Response $Stream 200 "OK" $Body (Get-MimeType $FilePath) ($Parts[0] -eq "HEAD")
    } catch {
      Write-Host "[WARN] Request failed: $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
      if ($Reader) { $Reader.Dispose() }
      $Client.Dispose()
    }
  }
} finally {
  $Listener.Stop()
}
