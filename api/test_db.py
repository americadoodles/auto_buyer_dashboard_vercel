#!/usr/bin/env python3
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.config import settings
from core.db import get_conn, DB_ENABLED, apply_schema_if_needed

def test_db_connection():
    print("=== Database Connection Test ===")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    print(f"DB_ENABLED: {DB_ENABLED}")
    
    if not DB_ENABLED:
        print("❌ Database is disabled!")
        return False
    
    try:
        print("🔌 Attempting to connect to database...")
        conn = get_conn()
        if conn is None:
            print("❌ get_conn() returned None")
            return False
        
        print("✅ Database connection successful!")
        
        # Test if we can execute a simple query
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()
            print(f"✅ PostgreSQL version: {version[0]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_schema_creation():
    print("\n=== Schema Creation Test ===")
    try:
        print("🔧 Attempting to create/apply schema...")
        apply_schema_if_needed()
        print("✅ Schema creation successful!")
        return True
    except Exception as e:
        print(f"❌ Schema creation failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    
    # Test connection
    if test_db_connection():
        # Test schema creation
        test_schema_creation()
    else:
        print("\n❌ Cannot proceed with schema creation - connection failed")
