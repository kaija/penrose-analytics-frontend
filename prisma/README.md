# Prisma Database Setup

This directory contains the Prisma schema and migrations for the Prism CDP + Analytics Platform.

## Quick Start

### 1. Start PostgreSQL with Docker Compose

```bash
docker compose up -d
```

This will start a PostgreSQL 16 container with:
- Database: `prism`
- User: `prism`
- Password: `prism_dev_password`
- Port: `5432`

### 2. Apply Migrations

```bash
npx prisma migrate dev
```

This will:
- Apply all pending migrations to the database
- Generate the Prisma Client
- Update the database schema

### 3. Verify Migration Status

```bash
npx prisma migrate status
```

## Database Schema

The schema includes the following models:

- **User**: Authenticated users (Google OAuth)
- **Project**: Customer data workspaces
- **ProjectMembership**: User roles within projects (owner, admin, editor, viewer)
- **Invitation**: Email invitations to join projects
- **Dashboard**: Analytics dashboard containers
- **Widget**: Dashboard visualization components
- **Report**: Saved analytics queries
- **Profile**: Customer profile records
- **Event**: Tracking event data
- **AuditLog**: System activity logs

## Creating New Migrations

When you modify the schema:

1. Edit `schema.prisma`
2. Create a migration:
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```
3. The migration will be created in `prisma/migrations/`
4. Commit the migration files to version control

## Production Deployment

In production, migrations are applied automatically on container startup via the `docker-entrypoint.sh` script:

```bash
npx prisma migrate deploy
```

This command:
- Applies pending migrations
- Does not prompt for input
- Fails if migrations cannot be applied

## Prisma Studio

To explore the database with a GUI:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555`

## Environment Variables

Required environment variable:

```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

See `.env.example` for the complete list of required environment variables.

## Testing

Migration tests are located in `__tests__/database/migration.test.ts` and verify:

- Migrations are applied successfully
- All tables are created
- Indexes are created
- Migration history is tracked

Run tests with:

```bash
npm test -- __tests__/database/migration.test.ts
```
