@echo off
title TeleScrape Bot Server
echo ===================================================
echo     TeleScrape Telegram Scraper & Add-Member Bot
echo ===================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    pause
    exit /b
)

if not exist venv (
    echo [*] Creating virtual environment...
    python -m venv venv
)

echo [*] Activating environment...
call venv\Scripts\activate

echo [*] Installing required libraries (FastAPI, Uvicorn, Telethon)...
pip install -r requirements.txt

echo.
echo [✓] Server starting on http://127.0.0.1:8000
echo [*] Open your web browser and go to http://127.0.0.1:8000
echo ===================================================
python server.py
pause
