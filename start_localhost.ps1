Write-Host "Installing Backend Dependencies..."
Set-Location -Path .\backend
npm install
if ($LASTEXITCODE -ne 0) { throw "Backend install failed" }

Write-Host "Initializing SQLite Database..."
node scripts/migrate.js
if ($LASTEXITCODE -ne 0) { throw "Migration failed" }

Write-Host "Starting Backend API..."
$backendProcess = Start-Process node -ArgumentList "src/app.js" -PassThru

Set-Location -Path ..\frontend\sensor-enabled-smart-parking
Write-Host "Installing Frontend Dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { throw "Frontend install failed" }

Write-Host "Starting Frontend App..."
Start-Process npm -ArgumentList "run dev" -PassThru

Write-Host "All services started! Check the console windows or localhost:5173"
