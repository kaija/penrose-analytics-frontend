#!/usr/bin/env python3
"""
Database Schema Dump Script (Docker Version)

This script dumps the PostgreSQL database schema to docs/prism.sql
by reading the database connection credentials from the .env file.
Uses Docker to run pg_dump without requiring local PostgreSQL installation.

Usage:
    python scripts/dump_schema_docker.py
"""

import os
import sys
import subprocess
from pathlib import Path
from urllib.parse import urlparse


def load_env_file(env_path: str = ".env") -> dict:
    """Load environment variables from .env file."""
    env_vars = {}
    
    if not os.path.exists(env_path):
        print(f"Error: {env_path} file not found")
        sys.exit(1)
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            # Parse KEY="VALUE" or KEY=VALUE
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                env_vars[key] = value
    
    return env_vars


def parse_database_url(database_url: str) -> dict:
    """Parse PostgreSQL connection URL into components."""
    parsed = urlparse(database_url)
    
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/').split('?')[0],
        'user': parsed.username,
        'password': parsed.password,
    }


def dump_schema_docker(db_config: dict, output_file: str):
    """Dump PostgreSQL schema using pg_dump via Docker."""
    
    # Prepare docker run command with pg_dump
    cmd = [
        'docker', 'run', '--rm',
        '--network', 'host',  # Use host network to access localhost
        '-e', f"PGPASSWORD={db_config['password']}" if db_config['password'] else 'PGPASSWORD=',
        'postgres:16',  # Use official PostgreSQL image
        'pg_dump',
        '--host', db_config['host'],
        '--port', str(db_config['port']),
        '--username', db_config['user'],
        '--dbname', db_config['database'],
        '--schema-only',  # Only dump schema, not data
        '--no-owner',     # Don't output commands to set ownership
        '--no-privileges', # Don't output commands to set privileges
    ]
    
    print(f"Dumping schema from database: {db_config['database']}")
    print(f"Host: {db_config['host']}:{db_config['port']}")
    print(f"Output file: {output_file}")
    print(f"Using Docker to run pg_dump...")
    
    try:
        # Run docker command and capture output
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Write output to file
        with open(output_file, 'w') as f:
            f.write(result.stdout)
        
        print(f"\n✓ Schema successfully dumped to {output_file}")
        
        # Show file size
        file_size = os.path.getsize(output_file)
        print(f"  File size: {file_size:,} bytes")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error dumping schema:")
        print(f"  {e.stderr}")
        return False
    except FileNotFoundError:
        print("\n✗ Error: docker command not found")
        print("  Please ensure Docker is installed and running:")
        print("  - macOS: https://docs.docker.com/desktop/install/mac-install/")
        print("  - Windows: https://docs.docker.com/desktop/install/windows-install/")
        print("  - Linux: https://docs.docker.com/engine/install/")
        return False


def main():
    """Main function."""
    
    # Get project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Load environment variables
    env_file = project_root / '.env'
    print(f"Loading environment from: {env_file}")
    env_vars = load_env_file(str(env_file))
    
    # Get DATABASE_URL
    database_url = env_vars.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL not found in .env file")
        sys.exit(1)
    
    # Parse database connection
    db_config = parse_database_url(database_url)
    
    # Ensure docs directory exists
    docs_dir = project_root / 'docs'
    docs_dir.mkdir(exist_ok=True)
    
    # Output file path
    output_file = docs_dir / 'prism.sql'
    
    # Dump schema
    success = dump_schema_docker(db_config, str(output_file))
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
