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
echo Cykla Web wird gestartet.
echo Oeffne danach im Browser: http://localhost:8082
echo Beenden mit Strg+C.
echo.

call npm run web

if errorlevel 1 (
  echo.
  echo Die Web-Vorschau wurde mit einem Fehler beendet.
  pause
)
