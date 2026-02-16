/**
 * Property-based tests for database migrations
 * Feature: prism, Property 18: Migration History Tracking
 * **Validates: Requirements 14.4**
 */

import { prisma } from '@/lib/prisma';
import * as fc from 'fast-check';

describe('Property 18: Migration History Tracking', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Property 18: Migration History Tracking
   * For any successfully applied Prisma migration, the system must record 
   * the migration in the database migration history table.
   */
  it('should record all applied migrations in _prisma_migrations table', async () => {
    await fc.assert(
      fc.asyncProperty(
        // We don't generate arbitrary migrations, but verify the property
        // holds for all existing migrations in the system
        fc.constant(null),
        async () => {
          // Query all migrations from the history table
          const migrations = await prisma.$queryRaw<Array<{
            id: string;
            checksum: string;
            finished_at: Date | null;
            migration_name: string;
            logs: string | null;
            rolled_back_at: Date | null;
            started_at: Date;
            applied_steps_count: number;
          }>>`
            SELECT * FROM _prisma_migrations
            ORDER BY started_at ASC
          `;

          // Property: All migrations must be recorded
          expect(migrations).toBeDefined();
          expect(migrations.length).toBeGreaterThan(0);

          // Property: Each migration must have required fields
          for (const migration of migrations) {
            // Must have a unique ID
            expect(migration.id).toBeDefined();
            expect(typeof migration.id).toBe('string');
            expect(migration.id.length).toBeGreaterThan(0);

            // Must have a migration name
            expect(migration.migration_name).toBeDefined();
            expect(typeof migration.migration_name).toBe('string');
            expect(migration.migration_name.length).toBeGreaterThan(0);

            // Must have a checksum for integrity verification
            expect(migration.checksum).toBeDefined();
            expect(typeof migration.checksum).toBe('string');

            // Must have a started_at timestamp
            expect(migration.started_at).toBeDefined();
            expect(migration.started_at).toBeInstanceOf(Date);

            // Successfully applied migrations must have finished_at
            if (migration.rolled_back_at === null) {
              expect(migration.finished_at).not.toBeNull();
              expect(migration.finished_at).toBeInstanceOf(Date);
              
              // finished_at must be after or equal to started_at
              expect(migration.finished_at!.getTime()).toBeGreaterThanOrEqual(
                migration.started_at.getTime()
              );
            }

            // Must have applied_steps_count >= 0
            expect(migration.applied_steps_count).toBeDefined();
            expect(typeof migration.applied_steps_count).toBe('number');
            expect(migration.applied_steps_count).toBeGreaterThanOrEqual(0);
          }

          // Property: Migration names must be unique
          const migrationNames = migrations.map(m => m.migration_name);
          const uniqueNames = new Set(migrationNames);
          expect(uniqueNames.size).toBe(migrationNames.length);

          // Property: Migration IDs must be unique
          const migrationIds = migrations.map(m => m.id);
          const uniqueIds = new Set(migrationIds);
          expect(uniqueIds.size).toBe(migrationIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Migration history must be chronologically ordered
   */
  it('should maintain chronological order of migrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const migrations = await prisma.$queryRaw<Array<{
            migration_name: string;
            started_at: Date;
            finished_at: Date | null;
          }>>`
            SELECT migration_name, started_at, finished_at
            FROM _prisma_migrations
            ORDER BY started_at ASC
          `;

          // Property: Each migration's started_at must be >= previous migration's started_at
          for (let i = 1; i < migrations.length; i++) {
            const prevMigration = migrations[i - 1];
            const currentMigration = migrations[i];

            expect(currentMigration.started_at.getTime()).toBeGreaterThanOrEqual(
              prevMigration.started_at.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Successfully applied migrations must have all required metadata
   */
  it('should store complete metadata for each migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const migrations = await prisma.$queryRaw<Array<{
            id: string;
            checksum: string;
            finished_at: Date | null;
            migration_name: string;
            logs: string | null;
            rolled_back_at: Date | null;
            started_at: Date;
            applied_steps_count: number;
          }>>`
            SELECT * FROM _prisma_migrations
            WHERE rolled_back_at IS NULL
          `;

          // Property: All non-rolled-back migrations must be complete
          for (const migration of migrations) {
            // Must have finished successfully
            expect(migration.finished_at).not.toBeNull();
            expect(migration.finished_at).toBeInstanceOf(Date);

            // Must have applied at least one step (or be a baseline migration)
            expect(migration.applied_steps_count).toBeGreaterThanOrEqual(0);

            // Must not be rolled back
            expect(migration.rolled_back_at).toBeNull();

            // Checksum must be a valid hash (non-empty string)
            expect(migration.checksum).toBeDefined();
            expect(migration.checksum.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Migration table must be queryable and accessible
   */
  it('should allow querying migration history at any time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Property: The _prisma_migrations table must always be accessible
          const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM _prisma_migrations
          `;

          expect(result).toBeDefined();
          expect(result.length).toBe(1);
          expect(Number(result[0].count)).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
