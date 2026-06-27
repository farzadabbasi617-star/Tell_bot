#!/usr/bin/env bash
echo "==================================================="
echo "    TeleScrape Telegram Scraper & Add-Member Bot"
echo "==================================================="

if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 is not installed!"
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
fi

echo "[*] Activating virtual environment..."
source venv/bin/activate

echo "[*] Installing dependencies..."
pip install -r requirements.txt

echo "[✓] Starting TeleScrape Server on http://127.0.0.1:8000"
echo "[*] Open http://127.0.0.1:8000 in your web browser."
python server.py
