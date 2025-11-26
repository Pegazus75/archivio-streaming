@echo off
title Push database.json -> GitHub (archivio-streaming)
setlocal enabledelayedexpansion

REM --- Modifica qui la cartella della tua repo locale se necessario ---
set "REPO_DIR=K:\html in json\SITO_github\film_serie_json_da_unire\archivio-streaming"
set "FILE=database.json"

echo Repository target: %REPO_DIR%
if not exist "%REPO_DIR%" (
  echo ERRORE: la cartella %REPO_DIR% non esiste.
  pause
  exit /b 1
)

cd /d "%REPO_DIR%"

REM --- Controllo file ---
if not exist "%FILE%" (
  echo ERRORE: "%FILE%" non trovato in %REPO_DIR%.
  echo Copia il file "%FILE%" aggiornato in questa cartella e riesegui lo script.
  pause
  exit /b 1
)

echo.
echo 1) Passo al branch main e aggiorno dalla remote...
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
  echo ERRORE: Questa cartella non sembra una repository Git.
  pause
  exit /b 1
)

REM Assicuro di avere main (non sovrascrivo cambi locali)
git checkout main 2>nul
if %errorlevel% neq 0 (
  echo ATTENZIONE: impossibile fare checkout su 'main'. Provo a creare/forzare il branch main...
  git branch -M main
)

git pull --rebase origin main
if %errorlevel% neq 0 (
  echo AVVISO: 'git pull' ha restituito un errore. Controlla eventuali conflitti o la connettivita'.
)

echo.
echo 2) Aggiungo e commito "%FILE%"...
git add "%FILE%"
REM commit con timestamp per avere traccia sempre di un cambiamento
for /f "tokens=1-2 delims= " %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%a_%%b
git commit -m "Aggiorna database.json @ %TIMESTAMP%" 2>nul
if %errorlevel% equ 0 (
  echo Commit creato.
) else (
  echo Nessuna modifica da committare o commit non necessario.
)

echo.
echo 3) Push su origin main...
git push origin main
if %errorlevel% neq 0 (
  echo ERRORE durante il push. Possibili cause:
  echo - credenziali non configurate / autenticazione fallita
  echo - conflitti locali/remoti
  echo - mancanza di permessi sulla repo remota
  echo Controlla con: git status && git log -n 5 --oneline
  pause
  exit /b 1
)

echo.
echo Fatto: "%FILE%" pushato su origin/main.
echo Il link raw su GitHub (es. https://raw.githubusercontent.com/username/repo/main/database.json) rimane lo stesso fintanto che non cambi nome/percorso/branch.
echo.
echo NOTE: se dopo il push vedi ancora il vecchio contenuto, potrebbe essere un effetto di cache (browser/CDN). Il tuo JS con fetch(cache:"no-store") generalmente evita la cache.
pause
endlocal
exit /b 0
