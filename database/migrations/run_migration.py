"""
Script to apply business dashboard database migrations to Supabase.
Run this script to set up the required tables for business features.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Get project root
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from app.config import settings


def run_migration():
    """Execute the business schema SQL migration"""
    
    print("Connecting to Supabase...")
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    
    # Read SQL migration file
    migration_file = project_root / "scripts" / "business_schema.sql"
    
    if not migration_file.exists():
        print(f"Error: Migration file not found at {migration_file}")
        return False
    
    print(f"Reading migration from {migration_file}...")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Split by semicolons to execute statements individually
    statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip()]
    
    print(f"Found {len(statements)} SQL statements to execute")
    
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        # Skip comments and empty statements
        if statement.startswith('--') or statement.startswith('/*') or not statement:
            continue
        
        try:
            print(f"Executing statement {i}/{len(statements)}...")
            # Use Supabase RPC to execute raw SQL
            result = supabase.rpc('exec_sql', {'sql_query': statement}).execute()
            success_count += 1
        except Exception as e:
            # Some errors are expected (e.g., table already exists)
            error_msg = str(e).lower()
            if 'already exists' in error_msg or 'duplicate' in error_msg:
                print(f"⚠️  Skipping (already exists): {statement[:60]}...")
            else:
                print(f"❌ Error executing statement {i}: {e}")
                print(f"Statement: {statement[:100]}...")
                error_count += 1
    
    print("\n" + "="*60)
    print(f"Migration complete!")
    print(f"✅ Successful: {success_count}")
    print(f"⚠️  Skipped/Errors: {error_count}")
    print("="*60)
    
    if error_count > 0:
        print("\nNote: Some errors are expected for existing tables.")
        print("Please verify your database schema in Supabase dashboard.")
    
    return True


if __name__ == "__main__":
    print("="*60)
    print("Business Dashboard Database Migration")
    print("="*60)
    print()
    
    if not settings.supabase_url or not settings.supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        sys.exit(1)
    
    print(f"Supabase URL: {settings.supabase_url}")
    print()
    
    confirm = input("Run migration? (yes/no): ")
    
    if confirm.lower() in ['yes', 'y']:
        success = run_migration()
        sys.exit(0 if success else 1)
    else:
        print("Migration cancelled.")
        sys.exit(0)
