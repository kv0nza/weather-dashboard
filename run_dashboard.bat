@echo off
title SkyPulse Weather Dashboard Launcher
cd /d "%~dp0"

echo ========================================================
echo        SkyPulse Weather Dashboard Launcher
echo ========================================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting local Python server...
    python server.py
    goto :eof
)

:: Check if Node is available
node -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting local Node.js server...
    node server.js
    goto :eof
)

:: Fallback: Open index.html directly
echo Opening index.html directly in your default browser...
start "" "index.html"
timeout /t 2 >nul
exit
