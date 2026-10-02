@echo off
setlocal
cd /d "%~dp0\..\.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FEHLER: Node.js wurde nicht gefunden.
  echo Bitte installiere Node.js und starte diese Datei danach erneut.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo Abhaengigkeiten werden einmalig installiert ...
  call npm install
  if errorlevel 1 (
    echo.
    echo FEHLER: npm install ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

echo.
echo Cykla fuer iPhone wird gestartet.
echo.
echo 1. Oeffne Expo Go auf dem iPhone.
echo 2. Verbinde iPhone und PC mit demselben WLAN.
echo 3. Scanne den gleich angezeigten QR-Code.
echo.
echo Hinweis: Ein iOS-Simulator kann nur auf einem Mac gestartet werden.
echo Beenden mit Strg+C.
echo.

call npx expo start --clear

if errorlevel 1 (
  echo.
  echo Expo wurde mit einem Fehler beendet.
  pause
)
