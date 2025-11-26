@echo off
REM update_db_and_push.bat - esegui dentro K:\html in json\SITO_github\film_serie_json_da_unire\archivio-streaming

REM Imposta percorso della repo (modifica se necessario)
set REPO_DIR="K:\html in json\SITO_github\film_serie_json_da_unire\archivio-streaming"
set FILE=database.json

cd /d %REPO_DIR%
if not exist "%FILE%" (
  echo File %FILE% non trovato in %REPO_DIR%.
  echo Copia il file database.json nella cartella sopra e riesegui questo script.
  pause
  exit /b 1
)

echo 1) Assicuro di essere su branch main e aggiorno da remoto...
git checkout main
git pull origin main

echo 2) Aggiungo e commito il file...
git add "%FILE%"
REM Il commit potrebbe fallire se non ci sono cambi; ignoriamo l'errore
git commit -m "Aggiorna database.json" 2>nul

echo 3) Push su origin/main...
git push origin main

if %errorlevel% neq 0 (
  echo ERRORE durante il push. Controlla le tue credenziali Git o conflitti.
  pause
  exit /b 1
)

echo Fatto: database.json pushato su origin/main.
pause
