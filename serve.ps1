# =============================================
# Tarot PWA - Development Server
# Requires PowerShell 5.1+
# =============================================

param(
    [int]$Port = 8443,
    [switch]$HttpOnly
)

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# MIME types
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
}

$scheme = 'http'
$prefix = "${scheme}://localhost:${Port}/"

Write-Host ''
Write-Host '  ========================================' -ForegroundColor DarkYellow
Write-Host '  Tarot PWA - Development Server' -ForegroundColor Yellow
Write-Host '  ========================================' -ForegroundColor DarkYellow
Write-Host ''
Write-Host "  URL: $prefix" -ForegroundColor Cyan
Write-Host "  Dir: $projectDir" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  NOTE: For camera access on mobile,' -ForegroundColor DarkGray
Write-Host '  use ngrok or similar for HTTPS tunnel' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Press Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host ''

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "  [OK] Server running at $prefix" -ForegroundColor Green
    Write-Host ''

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq '/') { $urlPath = '/index.html' }

        $filePath = Join-Path $projectDir ($urlPath -replace '/', '\')

        # Security: prevent path traversal
        $resolvedPath = [System.IO.Path]::GetFullPath($filePath)
        if (-not $resolvedPath.StartsWith($projectDir)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = 'application/octet-stream' }

            $response.ContentType = $contentType
            $response.StatusCode = 200

            # CORS headers for development
            $response.Headers.Add('Access-Control-Allow-Origin', '*')
            $response.Headers.Add('Cache-Control', 'no-cache')

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)

            $statusColor = 'Green'
            $statusText = '200'
        } else {
            $response.StatusCode = 404
            $errorBody = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType = 'text/plain; charset=utf-8'
            $response.ContentLength64 = $errorBody.Length
            $response.OutputStream.Write($errorBody, 0, $errorBody.Length)

            $statusColor = 'Red'
            $statusText = '404'
        }

        $timestamp = Get-Date -Format 'HH:mm:ss'
        Write-Host "  [$timestamp] $statusText $urlPath" -ForegroundColor $statusColor
        $response.Close()
    }
} catch {
    Write-Host ''
    Write-Host "  [ERROR] Port $Port may be in use. Try: .\serve.ps1 -Port 8444" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkRed
    Write-Host ''
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
    if ($listener) {
        $listener.Close()
    }
    Write-Host ''
    Write-Host '  Server stopped.' -ForegroundColor DarkGray
}
