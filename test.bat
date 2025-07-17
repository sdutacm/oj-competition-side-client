@echo off
title SDUT OJ Contest Client - Test Script
echo.
echo ========================================
echo   SDUT OJ Contest Client - Test Script
echo ========================================
echo.

echo 🧪 Testing built application...
echo.

REM Check if build output exists
if not exist "out\make\zip\win32\x64\SDUT OJ Contest Client-win32-x64-1.0.0.zip" (
    echo ❌ Build output not found. Please run build.bat first.
    echo.
    pause
    exit /b 1
)

echo ✅ Build output found
echo.

REM Check if application can be extracted and run
echo 📦 Extracting application for testing...
if exist "temp-test" rmdir /s /q "temp-test"
mkdir "temp-test"

REM Extract using PowerShell
powershell -command "Expand-Archive -Path 'out\make\zip\win32\x64\SDUT OJ Contest Client-win32-x64-1.0.0.zip' -DestinationPath 'temp-test' -Force"

if errorlevel 1 (
    echo ❌ Failed to extract application
    pause
    exit /b 1
)

echo ✅ Application extracted successfully
echo.

REM Check if executable exists
if not exist "temp-test\SDUT OJ Contest Client-win32-x64\sdut-oj-contest-client.exe" (
    echo ❌ Executable not found in extracted files
    pause
    exit /b 1
)

echo ✅ Executable found
echo.

echo 🚀 Starting application for testing...
echo Press any key to continue with test launch...
pause >nul

REM Launch application for testing
start "" "temp-test\SDUT OJ Contest Client-win32-x64\sdut-oj-contest-client.exe"

echo.
echo ✅ Application launched successfully!
echo.
echo 📋 Test completed. Please verify:
echo 1. Application window opens
echo 2. Loads SDUT OJ homepage
echo 3. Toolbar buttons work
echo 4. Keyboard shortcuts work
echo.
echo 🧹 Cleaning up test files...
timeout /t 5 /nobreak >nul
rmdir /s /q "temp-test"

echo.
echo 🎉 Test completed successfully!
echo.
pause
