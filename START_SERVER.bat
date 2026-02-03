@echo off
echo ========================================
echo   ECLIPSE COMMANDER - SERVER LOCALE
echo ========================================
echo.
echo Avvio server sulla porta 8000...
echo.
echo Apri browser e vai a:
echo   http://localhost:8000
echo.
echo Premi CTRL+C per fermare il server
echo ========================================
echo.

REM Prova Python 3
python -m http.server 8000 2>nul
if %errorlevel% == 0 goto :end

REM Prova Python 2
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% == 0 goto :end

REM Se nessun Python trovato
echo.
echo ERRORE: Python non trovato!
echo.
echo Installa Python da: https://www.python.org/downloads/
echo IMPORTANTE: Durante installazione seleziona "Add Python to PATH"
echo.
pause

:end
