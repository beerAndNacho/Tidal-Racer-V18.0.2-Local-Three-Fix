@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==============================================================
echo   TIDAL RACER V18.0.2 - ONE CLICK LOCAL PLAY
echo ==============================================================
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell was not found.
  echo Use Python 3 instead: python serve_local.py
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_local.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] Tidal Racer could not start. See the message above.
  pause
)
exit /b %EXIT_CODE%

