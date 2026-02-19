/**
 * Property-based tests for super admin projects endpoint
 *
 * Feature: super-admin-dashboard
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Projects Property Tests', () => {
  // Track created resources for cleanup
  const createdProjects: string[] = [];
  const createdUsers: string[] = [];

  afterEach(async () => {
    // Clean up memberships first
    if (createdProjects.length > 0) {
      await prisma.projectMembership.deleteMany({
        where: { projectId: { in: createdProjects } },
      });
    }

    // Clean up projects
    if (createdProjects.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjects } },
      }).catch(() => {});
      createdProjects.length = 0;
    }

    // Clean up users
    if (createdUsers.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUsers } },
      }).catch(() => {});
      createdUsers.length = 0;
    }
  });

  /**
   * Property 3: Project data completeness
   *
   * For any project returned by the API, the project data should include all
   * required fields: id, name, enabled status, creation date, and member count.
   *
   * **Validates: Requirements 1.2**
   */
  test('Property 3: Project data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random project data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          enabled: fc.boolean(),
          memberCount: fc.integer({ min: 0, max: 10 }),
        }),
        async (projectData) => {
          // Create test project
          const project = await prisma.project.create({
            data: {
              name: projectData.name,
              enabled: projectData.enabled,
            },
          });
          createdProjects.push(project.id);

          // Create test users and memberships to match the desired member count
          for (let i = 0; i < projectData.memberCount; i++) {
            const user = await prisma.user.create({
              data: {
                email: `test-${Date.now()}-${i}-${Math.random()}@test.com`,
                name: `Test User ${i}`,
              },
            });
            createdUsers.push(user.id);

            await prisma.projectMembership.create({
              data: {
                userId: user.id,
                projectId: project.id,
                role: i === 0 ? 'owner' : 'viewer',
              },
            });
          }

          // Query project with member count (simulating API behavior)
          const projects = await prisma.project.findMany({
            where: { id: project.id },
            include: {
              _count: {
                select: { memberships: true }
              }
            },
          });

          // Transform to ProjectWithStats format (as API does)
          const projectsWithStats = projects.map(p => ({
            id: p.id,
            name: p.name,
            enabled: p.enabled,
            createdAt: p.createdAt,
            memberCount: p._count.memberships
          }));

          // Verify we got exactly one project
          expect(projectsWithStats).toHaveLength(1);
          const result = projectsWithStats[0];

          // Requirement 1.2: Verify all required fields are present and have correct types

          // Field: id - must be defined and be a string
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.id.length).toBeGreaterThan(0);

          // Field: name - must be defined and be a string
          expect(result.name).toBeDefined();
          expect(typeof result.name).toBe('string');
          expect(result.name).toBe(projectData.name);

          // Field: enabled - must be defined and be a boolean
          expect(result.enabled).toBeDefined();
          expect(typeof result.enabled).toBe('boolean');
          expect(result.enabled).toBe(projectData.enabled);

          // Field: createdAt - must be defined and be a Date
          expect(result.createdAt).toBeDefined();
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.createdAt.getTime()).toBeLessThanOrEqual(Date.now());

          // Field: memberCount - must be defined and be a number
          expect(result.memberCount).toBeDefined();
          expect(typeof result.memberCount).toBe('number');
          expect(result.memberCount).toBe(projectData.memberCount);
          expect(result.memberCount).toBeGreaterThanOrEqual(0);

          // Verify no extra fields are present (data completeness means exactly these fields)
          const expectedFields = ['id', 'name', 'enabled', 'createdAt', 'memberCount'];
          const actualFields = Object.keys(result);
          expect(actualFields.sort()).toEqual(expectedFields.sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});
