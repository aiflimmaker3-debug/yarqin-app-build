@echo off
setlocal
chcp 65001 >nul
title Tepekkur Buliqi - Server

REM Always switch to the folder where start.bat is located (works on C:, D:, shortcuts, etc.)
cd /d "%~dp0"

echo ========================================================
echo   Tepekkur Buliqi  -  Local Knowledge & Notes Vault
echo ========================================================
echo.

REM 1. Verify Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed on this computer.
    echo Please download and install Node.js LTS from:
    echo   https://nodejs.org
    echo Then double-click start.bat again.
    echo.
    pause
    exit /b 1
)

REM 2. First-run automatic dependency installation
if not exist "node_modules" (
    echo [1/2] Installing local libraries for the first time...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Check your connection and try again.
        pause
        exit /b 1
    )
    echo.
)

REM 3. Open the browser automatically once the local server starts
echo [2/2] Starting Tepekkur Buliqi at http://localhost:3000 ...
echo (Keep this window open while using the app. Close it to stop.)
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" http://localhost:3000"

REM 4. Start the local server
call npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Server stopped unexpectedly.
    pause
)
endlocal
