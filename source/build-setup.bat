@echo off
setlocal
chcp 65001 >nul
title Tepekkur Buliqi - Build Windows Setup.exe

cd /d "%~dp0"

echo ========================================================
echo   Tepekkur Buliqi - Windows Setup.exe Builder
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js LTS from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Installing project dependencies...
    call npm install
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

if not exist "node_modules\electron" (
    echo [2/3] Installing Electron and Electron Builder...
    call npm install -D electron electron-builder
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

echo [3/3] Building Tepekkur-Buliqi-Setup-1.0.0.exe ...
call npm run dist:win
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Installer created inside the "release" folder!
if exist "release" (
    start "" explorer "release"
)
pause
endlocal
