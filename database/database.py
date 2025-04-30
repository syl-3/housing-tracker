# database/database.py

import sqlite3
import os

DB_NAME = 'housing_tracker.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_bronze_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bronze_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_name TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zipcode TEXT,
            unit_name TEXT,
            unit_id TEXT,
            price_raw TEXT,
            beds TEXT,
            baths TEXT,
            sqft TEXT,
            available_move_in_date TEXT,
            total_available_units INTEGER,
            listing_url TEXT,
            scrape_date DATE,
            scrape_timestamp TEXT
        )
    ''')

    conn.commit()
    conn.close()
    print("Bronze table ensured.")

def clear_bronze_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM bronze_listings')

    conn.commit()
    conn.close()
    print("Bronze table cleared.")

def insert_bronze_listing(listing):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO bronze_listings (
            building_name, address, city, state, zipcode,
            unit_name, unit_id, price_raw, beds, baths, sqft,
            available_move_in_date, total_available_units,
            listing_url, scrape_date, scrape_timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        listing['building_name'],
        listing['address'],
        listing['city'],
        listing['state'],
        listing['zipcode'],
        listing['unit_name'],
        listing['unit_id'],
        listing['price_raw'],
        listing['beds'],
        listing['baths'],
        listing['sqft'],
        listing['available_move_in_date'],
        listing['total_available_units'],
        listing['listing_url'],
        listing['scrape_date'],
        listing['scrape_timestamp']
    ))

    conn.commit()
    conn.close()
