# Scripts

This directory contains utility scripts for the Prism Analytics project.

## dump_schema.py

Dumps the PostgreSQL database schema to `docs/prism.sql`.

### Prerequisites

- Python 3.6 or higher
- PostgreSQL client tools (`pg_dump` command)

### Installation

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download and install PostgreSQL from https://www.postgresql.org/download/

### Usage

```bash
python scripts/dump_schema.py
```

## dump_schema_docker.py (Recommended)

Alternative version that uses Docker to run `pg_dump` without requiring local PostgreSQL installation.

### Prerequisites

- Python 3.6 or higher
- Docker installed and running

### Usage

```bash
python scripts/dump_schema_docker.py
```

This is the recommended approach if you don't have PostgreSQL client tools installed locally.

## How It Works

Both scripts will:
1. Read the `DATABASE_URL` from the `.env` file
2. Connect to the PostgreSQL database
3. Dump the schema (tables, indexes, constraints, etc.) to `docs/prism.sql`
4. Display the output file size

### Output

The generated `docs/prism.sql` file contains:
- Table definitions
- Indexes
- Constraints (primary keys, foreign keys, unique constraints)
- Sequences
- Enums and custom types
- Views (if any)

The dump does NOT include:
- Data (only schema structure)
- Ownership information
- Privilege/grant statements

### Troubleshooting

**Error: pg_dump command not found** (dump_schema.py)
- Install PostgreSQL client tools (see Installation section above)
- Or use `dump_schema_docker.py` instead

**Error: docker command not found** (dump_schema_docker.py)
- Install Docker from https://www.docker.com/get-started

**Error: DATABASE_URL not found in .env file**
- Ensure the `.env` file exists in the project root
- Verify that `DATABASE_URL` is defined in the `.env` file

**Connection refused**
- Ensure the PostgreSQL server is running
- Check that the connection details in `DATABASE_URL` are correct
- Verify that the database exists

**Authentication failed**
- Check the username and password in `DATABASE_URL`
- Ensure the user has permission to access the database
