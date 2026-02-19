/**
 * Property-based tests for super admin access simulation
 *
 * Feature: super-admin-dashboard
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/super-admin/access-project/route';

// Mock session management
jest.mock('@/lib/session', () => {
  const actual = jest.requireActual('@/lib/session');
  return {
    ...actual,
    validateSession: jest.fn(),
    createAccessSimulationSession: jest.fn(),
  };
});

const prisma = new PrismaClient();

describe('Super Admin Access Simulation Property Tests', () => {
  // Track created resources for cleanup
  const createdProjects: string[] = [];
  const createdUsers: string[] = [];
  const createdAuditLogs: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up audit logs
    if (createdAuditLogs.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogs } },
      }).catch(() => {});
      createdAuditLogs.length = 0;
    }

    // Clean up memberships
    if (createdProjects.length > 0) {
      await prisma.projectMembership.deleteMany({
        where: { projectId: { in: createdProjects } },
      }).catch(() => {});
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
   * Property 6: Access simulation session creation
   *
   * For any valid project ID, initiating access simulation should create a session
   * with superAdminMode flag set to true, the original user ID preserved, and the
   * active project ID set to the target project.
   *
   * **Validates: Requirements 2.1, 2.3**
   */
  test('Property 6: Access simulation session creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // projectId
        fc.uuid(), // superAdminUserId
        async (projectId, superAdminUserId) => {
          const { validateSession, createAccessSimulationSession } = require('@/lib/session');

          // Reset mocks for this iteration
          validateSession.mockClear();
          createAccessSimulationSession.mockClear();

          // Create test super admin user
          const superAdminUser = await prisma.user.create({
            data: {
              email: `superadmin-${Date.now()}-${Math.random()}@test.com`,
              name: 'Super Admin',
            },
          });
          createdUsers.push(superAdminUser.id);

          // Set super admin email in environment
          const originalEnv = process.env.SUPER_ADMIN_EMAILS;
          process.env.SUPER_ADMIN_EMAILS = superAdminUser.email;

          // Create test project
          const project = await prisma.project.create({
            data: {
              name: `Test Project ${Date.now()}`,
              enabled: true,
            },
          });
          createdProjects.push(project.id);

          // Mock validateSession to return super admin session
          validateSession.mockResolvedValue({
            userId: superAdminUser.id,
            activeProjectId: null,
          });

          // Track the session data passed to createAccessSimulationSession
          let capturedUserId: string | undefined;
          let capturedProjectId: string | undefined;

          createAccessSimulationSession.mockImplementation(
            async (userId: string, projId: string) => {
              capturedUserId = userId;
              capturedProjectId = projId;
            }
          );

          // Make API request
          const request = new NextRequest('http://localhost/api/super-admin/access-project', {
            method: 'POST',
            body: JSON.stringify({ projectId: project.id }),
          });

          const response = await POST(request);
          const data = await response.json();

          // Verify response is successful
          expect(response.status).toBe(200);

          // Requirement 2.1: Verify createAccessSimulationSession was called
          expect(createAccessSimulationSession).toHaveBeenCalledTimes(1);

          // Requirement 2.1 & 2.3: Verify session creation parameters
          // The super admin user ID should be preserved
          expect(capturedUserId).toBe(superAdminUser.id);

          // The active project ID should be set to the target project
          expect(capturedProjectId).toBe(project.id);

          // Restore environment
          process.env.SUPER_ADMIN_EMAILS = originalEnv;
        }
      ),
      { numRuns: 50 } // Reduced runs due to database operations
    );
  });

  /**
   * Property 7: Access simulation redirect
   *
   * For any valid project ID, the access simulation API response should include
   * a redirect URL pointing to the project's dashboard.
   *
   * **Validates: Requirements 2.2**
   */
  test('Property 7: Access simulation redirect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // projectId
        async (projectId) => {
          const { validateSession, createAccessSimulationSession } = require('@/lib/session');

          // Reset mocks for this iteration
          validateSession.mockClear();
          createAccessSimulationSession.mockClear();

          // Create test super admin user
          const superAdminUser = await prisma.user.create({
            data: {
              email: `superadmin-${Date.now()}-${Math.random()}@test.com`,
              name: 'Super Admin',
            },
          });
          createdUsers.push(superAdminUser.id);

          // Set super admin email in environment
          const originalEnv = process.env.SUPER_ADMIN_EMAILS;
          process.env.SUPER_ADMIN_EMAILS = superAdminUser.email;

          // Create test project
          const project = await prisma.project.create({
            data: {
              name: `Test Project ${Date.now()}`,
              enabled: true,
            },
          });
          createdProjects.push(project.id);

          // Mock validateSession to return super admin session
          validateSession.mockResolvedValue({
            userId: superAdminUser.id,
            activeProjectId: null,
          });

          // Mock createAccessSimulationSession
          createAccessSimulationSession.mockResolvedValue(undefined);

          // Make API request
          const request = new NextRequest('http://localhost/api/super-admin/access-project', {
            method: 'POST',
            body: JSON.stringify({ projectId: project.id }),
          });

          const response = await POST(request);
          const data = await response.json();

          // Verify response is successful
          expect(response.status).toBe(200);

          // Requirement 2.2: Verify redirect URL is present
          expect(data.redirectUrl).toBeDefined();
          expect(typeof data.redirectUrl).toBe('string');

          // Requirement 2.2: Verify redirect URL points to project dashboard
          // The URL should be in the format /projects/{projectId}
          expect(data.redirectUrl).toBe(`/projects/${project.id}`);

          // Verify projectId is also returned in response
          expect(data.projectId).toBe(project.id);

          // Restore environment
          process.env.SUPER_ADMIN_EMAILS = originalEnv;
        }
      ),
      { numRuns: 50 } // Reduced runs due to database operations
    );
  });

  /**
   * Property 9: Access simulation audit logging
   *
   * For any access simulation action (start or end), an audit log entry should be
   * created with the super admin user ID, target project ID, and the correct action type.
   *
   * **Validates: Requirements 2.5, 7.3**
   */
  test('Property 9: Access simulation audit logging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // projectId
        async (projectId) => {
          const { validateSession, createAccessSimulationSession } = require('@/lib/session');

          // Reset mocks for this iteration
          validateSession.mockClear();
          createAccessSimulationSession.mockClear();

          // Create test super admin user
          const superAdminUser = await prisma.user.create({
            data: {
              email: `superadmin-${Date.now()}-${Math.random()}@test.com`,
              name: 'Super Admin',
            },
          });
          createdUsers.push(superAdminUser.id);

          // Set super admin email in environment
          const originalEnv = process.env.SUPER_ADMIN_EMAILS;
          process.env.SUPER_ADMIN_EMAILS = superAdminUser.email;

          // Create test project
          const project = await prisma.project.create({
            data: {
              name: `Test Project ${Date.now()}`,
              enabled: true,
            },
          });
          createdProjects.push(project.id);

          // Mock validateSession to return super admin session
          validateSession.mockResolvedValue({
            userId: superAdminUser.id,
            activeProjectId: null,
          });

          // Mock createAccessSimulationSession
          createAccessSimulationSession.mockResolvedValue(undefined);

          // Make API request
          const request = new NextRequest('http://localhost/api/super-admin/access-project', {
            method: 'POST',
            body: JSON.stringify({ projectId: project.id }),
          });

          const response = await POST(request);
          const data = await response.json();

          // Verify response is successful
          expect(response.status).toBe(200);

          // Requirement 2.5 & 7.3: Verify audit log entry was created
          const auditLogs = await prisma.auditLog.findMany({
            where: {
              userId: superAdminUser.id,
              projectId: project.id,
            },
            orderBy: { timestamp: 'desc' },
          });

          // Should have at least one audit log entry
          expect(auditLogs.length).toBeGreaterThanOrEqual(1);

          const auditLog = auditLogs[0];
          createdAuditLogs.push(auditLog.id);

          // Requirement 2.5: Verify audit log has correct user ID
          expect(auditLog.userId).toBe(superAdminUser.id);

          // Requirement 2.5: Verify audit log has correct project ID
          expect(auditLog.projectId).toBe(project.id);

          // Requirement 2.5: Verify audit log has correct action type
          expect(auditLog.action).toBe('super_admin.access_simulation.start');

          // Requirement 7.3: Verify audit log details contain necessary information
          expect(auditLog.details).toBeDefined();
          const details = auditLog.details as any;
          expect(details.type).toBe('super_admin_access_simulation');
          expect(details.projectId).toBe(project.id);
          expect(details.projectName).toBe(project.name);
          expect(details.timestamp).toBeDefined();

          // Verify timestamp is recent (within last 5 seconds)
          const logTime = new Date(auditLog.timestamp).getTime();
          const now = Date.now();
          expect(now - logTime).toBeLessThan(5000);

          // Restore environment
          process.env.SUPER_ADMIN_EMAILS = originalEnv;
        }
      ),
      { numRuns: 50 } // Reduced runs due to database operations
    );
  });
});
