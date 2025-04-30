# meta_tracker.py

import sqlite3
import os
from datetime import datetime

# Dynamic DB path for Fly or local
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "../housing_tracker.db"))

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_meta_table():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_updated TEXT
        )
    ''')
    cursor.execute('INSERT OR IGNORE INTO meta (id, last_updated) VALUES (1, NULL)')
    conn.commit()
    conn.close()

def update_last_updated():
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE meta SET last_updated = ? WHERE id = 1', (now,))
    conn.commit()
    conn.close()

def get_last_updated():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT last_updated FROM meta WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    return row['last_updated'] if row else None

if __name__ == "__main__":
    create_meta_table()
    update_last_updated()
    print("Last updated set to:", get_last_updated())
