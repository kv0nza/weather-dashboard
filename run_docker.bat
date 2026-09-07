@echo off
title SkyPulse Weather Dashboard - Docker Launcher
cd /d "%~dp0"

echo ========================================================
echo       SkyPulse Weather Dashboard Docker Launcher
echo ========================================================
echo.

:: Check if Docker is installed and in PATH
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker was not found in your system PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo and ensure it is running.
    echo.
    pause
    exit /b 1
)

:: Check if Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not currently running.
    echo Please start Docker Desktop and try running this script again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Building Docker image (skypulse-weather)...
docker build -t skypulse-weather .
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Stopping any previous container instance...
docker stop skypulse-weather-dashboard >nul 2>&1
docker rm skypulse-weather-dashboard >nul 2>&1

echo.
echo [3/3] Starting container on http://localhost:3000 ...
docker run -d -p 3000:3000 --name skypulse-weather-dashboard --restart unless-stopped skypulse-weather
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker container.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo  Success! Container is running at: http://localhost:3000
echo  To view container logs:   docker logs -f skypulse-weather-dashboard
echo  To stop the container:   docker stop skypulse-weather-dashboard
echo ========================================================
echo.

:: Open browser
timeout /t 1 >nul
start "" "http://localhost:3000"
pause
