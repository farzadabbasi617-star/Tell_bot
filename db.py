import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "telescrape.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        api_id TEXT DEFAULT '',
        api_hash TEXT DEFAULT '',
        bot_token TEXT DEFAULT '',
        auto_export BOOLEAN DEFAULT 1,
        stealth_mode BOOLEAN DEFAULT 0,
        add_delay INTEGER DEFAULT 5
    )
    """)
    cursor.execute("INSERT OR IGNORE INTO settings (id) VALUES (1)")
    
    # Accounts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        session_string TEXT DEFAULT '',
        name TEXT,
        status TEXT DEFAULT 'Active',
        load_percent INTEGER DEFAULT 0
    )
    """)
    
    # Members table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tg_id INTEGER UNIQUE,
        access_hash INTEGER DEFAULT 0,
        username TEXT,
        name TEXT,
        status TEXT,
        source_group TEXT,
        scraped_at TEXT,
        is_added BOOLEAN DEFAULT 0
    )
    """)
    try:
        cursor.execute("ALTER TABLE members ADD COLUMN is_added BOOLEAN DEFAULT 0")
    except Exception:
        pass
    
    # Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT,
        msg TEXT,
        type TEXT
    )
    """)
    
    # Proxies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proxies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT,
        port TEXT,
        type TEXT DEFAULT 'SOCKS5',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        location TEXT DEFAULT 'Global',
        latency TEXT DEFAULT '45ms',
        status TEXT DEFAULT 'Online'
    )
    """)
    
    conn.commit()
    conn.close()

# Log helper
def add_log(msg: str, log_type: str = "info"):
    conn = get_db()
    c = conn.cursor()
    time_str = datetime.now().strftime("%H:%M:%S")
    c.execute("INSERT INTO logs (time, msg, type) VALUES (?, ?, ?)", (time_str, msg, log_type))
    conn.commit()
    conn.close()

def get_logs(limit=50):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, time, msg, type FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# Stats helper
def get_stats():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM members")
    total_members = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM accounts WHERE status='Active'")
    active_accounts = c.fetchone()[0]
    
    c.execute("SELECT COUNT(DISTINCT source_group) FROM members")
    target_groups = c.fetchone()[0]
    
    conn.close()
    return {
        "total_members": total_members,
        "active_accounts": active_accounts,
        "target_groups": target_groups,
        "safety_score": "98%"
    }
