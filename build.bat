@echo off
title SDUT OJ Contest Client - Windows Build Script
echo.
echo ========================================
echo   SDUT OJ Contest Client - Build Script
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check npm
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ npm version:
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully!
echo.

REM Build application
echo 🔨 Building application...
npm run make
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 🎉 Build completed successfully!
echo.
echo 📂 Build artifacts are located in: out\make\
echo.
echo 📋 Available packages:
echo - ZIP package: out\make\zip\win32\x64\
echo - Windows installer: out\make\squirrel.windows\x64\
echo.
echo 💡 Tips:
echo - The ZIP package is portable and doesn't require installation
echo - The Windows installer creates a proper installation
echo - Check the README.md for installation instructions
echo.
pause
