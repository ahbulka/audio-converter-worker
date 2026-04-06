@echo off
chcp 65001
cls
echo 🎵 Audio Worker Deploy Script (Windows)
echo =======================================
echo.

:: Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git kurulu değil. https://git-scm.com/download/win indirin.
    pause
    exit /b 1
)

cd audio-worker

:: Git init
if not exist .git (
    echo 📁 Git repo oluşturuluyor...
    git init
    git add .
    git commit -m "Initial audio worker for cross-platform audio"
    echo ✅ Git repo hazır!
) else (
    echo ✅ Git repo zaten var
)

echo.
echo 🌐 GitHub Repo Oluştur:
echo    1. https://github.com/new adresine git
echo    2. Repo adı: audio-converter-worker
echo    3. Public veya Private seç
echo    4. "Create repository" tıkla
echo.
echo 📤 Push için şu komutları çalıştır:
echo.
echo    git remote add origin https://github.com/KULLANICI_ADIN/audio-converter-worker.git
echo    git branch -M main
echo    git push -u origin main
echo.

pause
