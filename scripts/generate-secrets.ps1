Write-Host "=== Generating SECRET_KEY ===" -ForegroundColor Cyan
$secretKey = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
Write-Host "SECRET_KEY=$secretKey" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== Generating .env file ===" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
    Write-Host "IMPORTANT: Edit .env with your database URL and API keys" -ForegroundColor Red
} else {
    Write-Host ".env already exists, skipping" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Installing pre-commit hooks ===" -ForegroundColor Cyan
try {
    & pre-commit install
    Write-Host "Pre-commit hooks installed" -ForegroundColor Green
} catch {
    Write-Host "Install pre-commit with: pip install pre-commit && pre-commit install" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green