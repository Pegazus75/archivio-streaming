@echo off
title Deploy su GitHub - Archivio Streaming
echo =========================================
echo      DEPLOY AUTOMATICO SU GITHUB
echo =========================================
echo.

REM --- Configura la cartella corrente ---
echo 📁 Cartella attuale:
cd
echo.

REM --- Controlla se .git esiste ---
if exist ".git" (
    echo 🔄 Repository già inizializzato. Procedo all'aggiornamento...
) else (
    echo 🚀 Inizializzazione di una nuova repository Git...
    git init
)

echo.
echo ➕ Aggiunta di tutti i file...
git add .

echo.
echo 💬 Creazione commit...
git commit -m "Aggiornamento automatico"

echo.
echo 🌿 Imposto branch principale su MAIN...
git branch -M main

echo.
echo 🔗 Configuro origine GitHub...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/Pegazus75/archivio-streaming.git

echo.
echo 📤 Invio file su GitHub...
git push -u origin main

echo.
echo =========================================
echo   ✅ DEPLOY COMPLETATO CON SUCCESSO!
echo =========================================
pause
