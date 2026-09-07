@echo off
setlocal enabledelayedexpansion
title SkyPulse Git Push Helper
cd /d "%~dp0"

echo ========================================================
echo        SkyPulse Weather Dashboard - Git Push
echo ========================================================
echo.

:: Verify Git is installed
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com or run:
    echo   winget install --id Git.Git -e --source winget
    echo.
    pause
    exit /b 1
)

:: Verify Git repository is initialized
if not exist ".git" (
    echo [INFO] Git repository not yet initialized in this folder.
    echo Initializing local repository...
    git init
    git branch -M main
    echo.
)

:: Check for commit message argument
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
    set /p "COMMIT_MSG=Enter commit message (or press Enter for default): "
)

if "%COMMIT_MSG%"=="" (
    for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set mydate=%%c-%%a-%%b
    for /f "tokens=1-2 delims=: " %%a in ("%time%") do set mytime=%%a:%%b
    set "COMMIT_MSG=Update weather dashboard (!mydate! !mytime!)"
)

echo.
echo Staging all changes...
git add .

echo Committing changes with message: "%COMMIT_MSG%"...
git commit -m "%COMMIT_MSG%"

echo.
echo Pushing to GitHub remote...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTE] Push failed. If you haven't linked your GitHub repository yet, run:
    echo   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    echo   git push -u origin main
    echo.
) else (
    echo.
    echo [SUCCESS] Successfully pushed to GitHub!
)

echo.
pause
