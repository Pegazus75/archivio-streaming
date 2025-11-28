@echo off
cd /d "%~dp0"

echo 1) Assicuro di essere su branch main e aggiorno da remoto...
git checkout main
git pull origin main

echo.
echo 2) Aggiungo TUTTE le modifiche trovate nella cartella...
git add -A

echo.
echo 3) Commit...
git commit -m "Aggiorna database e script" 2>nul

echo.
echo 4) Push su origin/main...
git push origin main

echo.
echo -- Operazione terminata.
echo Se non c'erano file cambiati, non è stato fatto nessun commit.
pause
