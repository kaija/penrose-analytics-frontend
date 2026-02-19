/**
 * Startup Migration Tests
 * Tests the migration behavior during container startup
 * Validates: Requirements 14.3, 14.5
 *
 * These are unit tests that verify the docker-entrypoint.sh script structure
 * and behavior. They test that:
 * - Migrations are applied successfully on startup (Requirement 14.3)
 * - Failed migrations prevent application startup (Requirement 14.5)
 *
 * Note: These tests verify the script logic without requiring a database connection.
 * Integration tests with actual database connections would be run in a containerized
 * environment during CI/CD.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

describe('Migration on Startup', () => {
  const entrypointPath = path.join(process.cwd(), 'docker-entrypoint.sh');

  describe('Successful Migration', () => {
    it('should apply migrations successfully on startup', async () => {
      // This test verifies that the entrypoint script runs migrations
      // In a real environment, this would be tested in integration tests
      // Here we verify the script exists and has the correct structure

      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script contains migration command
      expect(stdout).toContain('prisma migrate deploy');
      expect(stdout).toContain('Migrations completed successfully');
    }, 10000);

    it('should check DATABASE_URL before running migrations', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script checks for DATABASE_URL
      expect(stdout).toContain('DATABASE_URL');
      expect(stdout).toContain('environment variable is not set');
    });

    it('should start application after successful migration', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script starts the application after migrations
      expect(stdout).toContain('Starting application');
      expect(stdout).toContain('exec "$@"');
    });
  });

  describe('Failed Migration Prevention', () => {
    it('should exit with error code if DATABASE_URL is missing', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script exits with error code 1 if DATABASE_URL is missing
      expect(stdout).toMatch(/if.*DATABASE_URL.*exit 1/s);
    });

    it('should exit with error code if migration fails', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script exits with error code 1 if migration fails
      expect(stdout).toContain('Migration failed');
      expect(stdout).toMatch(/else[\s\S]*exit 1/);
    });

    it('should not start application if migration fails', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify that exec "$@" only happens after successful migration
      // The script should have the migration check before exec
      const lines = stdout.split('\n');
      const migrateIndex = lines.findIndex(line => line.includes('prisma migrate deploy'));
      const execIndex = lines.findIndex(line => line.includes('exec "$@"'));

      expect(migrateIndex).toBeGreaterThan(-1);
      expect(execIndex).toBeGreaterThan(-1);
      expect(execIndex).toBeGreaterThan(migrateIndex);
    });

    it('should use set -e to exit on any error', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify the script uses set -e to exit on errors
      expect(stdout).toContain('set -e');
    });
  });

  describe('Migration Error Handling', () => {
    it('should log error message when migration fails', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify error logging
      expect(stdout).toContain('ERROR: Migration failed');
    });

    it('should log error message when DATABASE_URL is missing', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify error logging for missing DATABASE_URL
      expect(stdout).toContain('ERROR: DATABASE_URL environment variable is not set');
    });

    it('should provide clear startup messages', async () => {
      const { stdout } = await execAsync(`cat ${entrypointPath}`);

      // Verify informative messages
      expect(stdout).toContain('Prism CDP Container Starting');
      expect(stdout).toContain('Running Prisma migrations');
    });
  });
});
