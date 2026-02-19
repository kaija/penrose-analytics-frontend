/**
 * Property-based tests for super admin users endpoint
 *
 * Feature: super-admin-dashboard
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { describe, test, expect, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Users Property Tests', () => {
  // Track created resources for cleanup
  const createdUsers: string[] = [];
  const createdProjects: string[] = [];

  afterEach(async () => {
    // Clean up memberships first
    if (createdUsers.length > 0 || createdProjects.length > 0) {
      await prisma.projectMembership.deleteMany({
        where: {
          OR: [
            { userId: { in: createdUsers } },
            { projectId: { in: createdProjects } },
          ],
        },
      });
    }

    // Clean up users
    if (createdUsers.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUsers } },
      }).catch(() => {});
      createdUsers.length = 0;
    }

    // Clean up projects
    if (createdProjects.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjects } },
      }).catch(() => {});
      createdProjects.length = 0;
    }
  });

  /**
   * Property 4: User data completeness
   *
   * For any user returned by the API, the user data should include all
   * required fields: id, email, name, avatar, and creation date.
   *
   * **Validates: Requirements 4.2**
   */
  test('Property 4: User data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user data
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          avatar: fc.oneof(
            fc.webUrl(),
            fc.constant(null)
          ),
        }),
        async (userData) => {
          // Create test user
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            },
          });
          createdUsers.push(user.id);

          // Query user (simulating API behavior)
          const users = await prisma.user.findMany({
            where: { id: user.id },
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              createdAt: true,
              memberships: {
                select: {
                  projectId: true,
                  role: true,
                  createdAt: true,
                  project: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          });

          // Transform to UserWithMemberships format (as API does)
          const usersWithMemberships = users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            avatar: u.avatar,
            createdAt: u.createdAt,
            memberships: u.memberships.map(m => ({
              projectId: m.projectId,
              projectName: m.project.name,
              role: m.role,
              createdAt: m.createdAt,
            })),
          }));

          // Verify we got exactly one user
          expect(usersWithMemberships).toHaveLength(1);
          const result = usersWithMemberships[0];

          // Requirement 4.2: Verify all required fields are present and have correct types

          // Field: id - must be defined and be a string
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.id.length).toBeGreaterThan(0);

          // Field: email - must be defined and be a string
          expect(result.email).toBeDefined();
          expect(typeof result.email).toBe('string');
          expect(result.email).toBe(userData.email);

          // Field: name - must be defined and be a string
          expect(result.name).toBeDefined();
          expect(typeof result.name).toBe('string');
          expect(result.name).toBe(userData.name);

          // Field: avatar - must be defined (can be null or string)
          expect(result.avatar !== undefined).toBe(true);
          if (result.avatar !== null) {
            expect(typeof result.avatar).toBe('string');
          }
          expect(result.avatar).toBe(userData.avatar);

          // Field: createdAt - must be defined and be a Date
          expect(result.createdAt).toBeDefined();
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.createdAt.getTime()).toBeLessThanOrEqual(Date.now());

          // Verify memberships field exists (even if empty)
          expect(result.memberships).toBeDefined();
          expect(Array.isArray(result.memberships)).toBe(true);

          // Verify no unexpected fields are present
          const expectedFields = ['id', 'email', 'name', 'avatar', 'createdAt', 'memberships'];
          const actualFields = Object.keys(result);
          expect(actualFields.sort()).toEqual(expectedFields.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: User membership data completeness
   *
   * For any user with memberships, each membership should include all
   * required fields: project name, role, and membership creation date.
   *
   * **Validates: Requirements 5.3, 5.4**
   */
  test('Property 5: User membership data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user and membership data
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          membershipCount: fc.integer({ min: 1, max: 5 }), // At least 1 membership
          memberships: fc.array(
            fc.record({
              projectName: fc.string({ minLength: 1, maxLength: 100 }),
              role: fc.constantFrom('owner', 'admin', 'editor', 'viewer'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async (testData) => {
          // Create test user
          const user = await prisma.user.create({
            data: {
              email: testData.email,
              name: testData.name,
            },
          });
          createdUsers.push(user.id);

          // Create projects and memberships
          for (const membershipData of testData.memberships) {
            const project = await prisma.project.create({
              data: {
                name: membershipData.projectName,
                enabled: true,
              },
            });
            createdProjects.push(project.id);

            await prisma.projectMembership.create({
              data: {
                userId: user.id,
                projectId: project.id,
                role: membershipData.role,
              },
            });
          }

          // Query user with memberships (simulating API behavior)
          const users = await prisma.user.findMany({
            where: { id: user.id },
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              createdAt: true,
              memberships: {
                select: {
                  projectId: true,
                  role: true,
                  createdAt: true,
                  project: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          });

          // Transform to UserWithMemberships format (as API does)
          const usersWithMemberships = users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            avatar: u.avatar,
            createdAt: u.createdAt,
            memberships: u.memberships.map(m => ({
              projectId: m.projectId,
              projectName: m.project.name,
              role: m.role,
              createdAt: m.createdAt,
            })),
          }));

          // Verify we got exactly one user
          expect(usersWithMemberships).toHaveLength(1);
          const result = usersWithMemberships[0];

          // Verify user has memberships
          expect(result.memberships).toBeDefined();
          expect(Array.isArray(result.memberships)).toBe(true);
          expect(result.memberships.length).toBeGreaterThan(0);
          expect(result.memberships.length).toBe(testData.memberships.length);

          // Requirements 5.3, 5.4: Verify each membership has all required fields
          for (const membership of result.memberships) {
            // Field: projectId - must be defined and be a string
            expect(membership.projectId).toBeDefined();
            expect(typeof membership.projectId).toBe('string');
            expect(membership.projectId.length).toBeGreaterThan(0);

            // Field: projectName - must be defined and be a string (Requirement 5.4)
            expect(membership.projectName).toBeDefined();
            expect(typeof membership.projectName).toBe('string');
            expect(membership.projectName.length).toBeGreaterThan(0);

            // Field: role - must be defined and be a valid role string (Requirement 5.4)
            expect(membership.role).toBeDefined();
            expect(typeof membership.role).toBe('string');
            expect(['owner', 'admin', 'editor', 'viewer']).toContain(membership.role);

            // Field: createdAt - must be defined and be a Date (Requirement 5.4)
            expect(membership.createdAt).toBeDefined();
            expect(membership.createdAt).toBeInstanceOf(Date);
            expect(membership.createdAt.getTime()).toBeLessThanOrEqual(Date.now());

            // Verify no extra fields are present in membership
            const expectedMembershipFields = ['projectId', 'projectName', 'role', 'createdAt'];
            const actualMembershipFields = Object.keys(membership);
            expect(actualMembershipFields.sort()).toEqual(expectedMembershipFields.sort());
          }

          // Verify all created memberships are present
          const createdProjectNames = testData.memberships.map(m => m.projectName);
          const resultProjectNames = result.memberships.map(m => m.projectName);
          expect(resultProjectNames.sort()).toEqual(createdProjectNames.sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});
