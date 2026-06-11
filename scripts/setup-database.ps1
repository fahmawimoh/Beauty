# Beauty Database Setup Script
# Creates and starts the PostgreSQL "Beauty" database via Docker.

Write-Host "=== Beauty PostgreSQL Database Setup ===" -ForegroundColor Cyan

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop, then run this script again." -ForegroundColor Yellow
    exit 1
}

Set-Location $PSScriptRoot\..

Write-Host "Starting PostgreSQL with database 'Beauty'..." -ForegroundColor Green
docker compose up -d

Write-Host "Waiting for database to be healthy..." -ForegroundColor Yellow
$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
    $health = docker inspect --format='{{.State.Health.Status}}' beauty-postgres 2>$null
    if ($health -eq "healthy") {
        Write-Host "Beauty database is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Connection details:" -ForegroundColor Cyan
        Write-Host "  Host:     localhost"
        Write-Host "  Port:     5432"
        Write-Host "  Database: Beauty"
        Write-Host "  Username: beauty"
        Write-Host "  Password: beauty123"
        Write-Host ""
        Write-Host "Demo admin (seeded on first API start):" -ForegroundColor Cyan
        Write-Host "  Email:    admin@beauty.com"
        Write-Host "  Password: Admin@123"
        Write-Host ""
        Write-Host "Next: cd backend; dotnet run --project src/Beauty.Api" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 2
    Write-Host "  Attempt $i/$maxAttempts..." -ForegroundColor Gray
}

Write-Host "Database did not become healthy. Check: docker logs beauty-postgres" -ForegroundColor Red
exit 1
