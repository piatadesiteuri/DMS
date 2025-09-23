# EDMS Sync Agent - Windows Build Script
# Rulează acest script pe o mașină Windows pentru a crea installer-ul

Write-Host "🚀 EDMS Sync Agent - Windows Build Script" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Verifică dacă Node.js este instalat
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js găsit: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js nu este instalat!" -ForegroundColor Red
    Write-Host "Descarcă și instalează Node.js de la: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verifică dacă npm este instalat
try {
    $npmVersion = npm --version
    Write-Host "✅ npm găsit: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm nu este instalat!" -ForegroundColor Red
    exit 1
}

# Navighează în directorul sync-agent
if (Test-Path "sync-agent") {
    Set-Location "sync-agent"
    Write-Host "✅ Directorul sync-agent găsit" -ForegroundColor Green
} else {
    Write-Host "❌ Directorul sync-agent nu a fost găsit!" -ForegroundColor Red
    Write-Host "Rulează acest script din directorul principal al proiectului" -ForegroundColor Yellow
    exit 1
}

# Instalează dependențele
Write-Host "📦 Instalez dependențele..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Eroare la instalarea dependențelor!" -ForegroundColor Red
    exit 1
}

# Instalează electron-builder global dacă nu există
Write-Host "🔧 Verific electron-builder..." -ForegroundColor Yellow
try {
    electron-builder --version | Out-Null
    Write-Host "✅ electron-builder găsit" -ForegroundColor Green
} catch {
    Write-Host "📦 Instalez electron-builder..." -ForegroundColor Yellow
    npm install -g electron-builder
}

# Construiește aplicația pentru Windows
Write-Host "🏗️ Construiesc aplicația pentru Windows..." -ForegroundColor Yellow
npm run build-win

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Build-ul s-a finalizat cu succes!" -ForegroundColor Green
    Write-Host "📁 Fișierele generate sunt în: dist/" -ForegroundColor Green
    
    # Listează fișierele generate
    if (Test-Path "dist") {
        Write-Host "📋 Fișiere generate:" -ForegroundColor Cyan
        Get-ChildItem "dist" -Filter "*.exe" | ForEach-Object { 
            Write-Host "   📄 $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor White
        }
        Get-ChildItem "dist" -Filter "*.msi" | ForEach-Object { 
            Write-Host "   📄 $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor White
        }
        Get-ChildItem "dist" -Filter "*.zip" | ForEach-Object { 
            Write-Host "   📄 $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "🎯 Următorii pași:" -ForegroundColor Yellow
    Write-Host "1. Testează fișierul .exe generat" -ForegroundColor White
    Write-Host "2. Distribuie installer-ul către utilizatori" -ForegroundColor White
    Write-Host "3. Installer-ul va crea shortcut-uri și va apărea în Control Panel" -ForegroundColor White
    
} else {
    Write-Host "❌ Build-ul a eșuat!" -ForegroundColor Red
    Write-Host "Verifică erorile de mai sus și încearcă din nou" -ForegroundColor Yellow
}

# Revine în directorul principal
Set-Location ".." 