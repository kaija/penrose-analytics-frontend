/**
 * Migration tests
 * Validates: Requirements 14.2, 14.3, 14.4
 */

import { prisma } from '@/lib/prisma';

describe('Database Migration', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have applied the initial migration successfully', async () => {
    // Query the _prisma_migrations table to verify migration was applied
    const migrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
      applied_steps_count: number;
    }>>`
      SELECT migration_name, finished_at, applied_steps_count
      FROM _prisma_migrations
    `;

    expect(migrations).toBeDefined();
    expect(migrations.length).toBeGreaterThan(0);

    // Verify the init migration exists
    const initMigration = migrations.find(m => m.migration_name.includes('init'));
    expect(initMigration).toBeDefined();
    expect(initMigration?.finished_at).not.toBeNull();
    expect(initMigration?.applied_steps_count).toBeGreaterThan(0);
  });

  it('should have created all required tables', async () => {
    // Query information_schema to get all tables
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = tables.map(t => t.table_name);

    // Verify all expected tables exist
    const expectedTables = [
      'User',
      'Project',
      'ProjectMembership',
      'Invitation',
      'Dashboard',
      'Widget',
      'Report',
      'Profile',
      'Event',
      'AuditLog',
      '_prisma_migrations'
    ];

    expectedTables.forEach(tableName => {
      expect(tableNames).toContain(tableName);
    });
  });

  it('should have created the Role enum', async () => {
    // Query pg_type to verify the Role enum exists
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e'
      AND typname = 'Role'
    `;

    expect(enums).toBeDefined();
    expect(enums.length).toBe(1);
    expect(enums[0].typname).toBe('Role');
  });

  it('should have created indexes on foreign keys', async () => {
    // Query pg_indexes to verify indexes exist
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY indexname
    `;

    const indexNames = indexes.map(i => i.indexname);

    // Verify some key indexes exist
    const expectedIndexes = [
      'ProjectMembership_userId_idx',
      'ProjectMembership_projectId_idx',
      'Invitation_token_idx',
      'Event_projectId_idx',
      'Event_profileId_idx',
      'Event_eventName_idx',
      'Event_timestamp_idx'
    ];

    expectedIndexes.forEach(indexName => {
      expect(indexNames).toContain(indexName);
    });
  });

  it('should be able to connect to the database', async () => {
    // Simple connection test
    const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
    expect(result[0].result).toBe(1);
  });

  it('should track migration history (Requirement 14.4)', async () => {
    // Verify that the _prisma_migrations table exists and contains records
    const migrationCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM _prisma_migrations
    `;

    expect(Number(migrationCount[0].count)).toBeGreaterThan(0);
  });
});
