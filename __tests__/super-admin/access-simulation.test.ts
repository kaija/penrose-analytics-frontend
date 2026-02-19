/**
 * Unit tests for super admin access simulation endpoint
 *
 * Tests the POST /api/super-admin/access-project endpoint to verify
 * error handling for various edge cases.
 *
 * Validates: Requirements 2.1, 7.1, 7.4
 */

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

describe('Super Admin Access Simulation Error Cases', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
      },
    });

    // Create test project
    testProject = await prisma.project.create({
      data: {
        name: 'Test Project',
        enabled: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up audit logs
    await prisma.auditLog.deleteMany({
      where: { userId: testUser.id },
    }).catch(() => {});

    // Clean up memberships
    await prisma.projectMembership.deleteMany({
      where: { projectId: testProject.id },
    }).catch(() => {});

    // Clean up project and user
    if (testProject) {
      await prisma.project.delete({
        where: { id: testProject.id },
      }).catch(() => {});
    }

    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      }).catch(() => {});
    }
  });

  /**
   * Test: Missing session returns 401 Unauthorized
   * Validates: Requirements 7.1, 7.4
   */
  test('returns 401 when session is missing', async () => {
    const { validateSession } = require('@/lib/session');

    // Mock validateSession to return null (no session)
    validateSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({ projectId: testProject.id }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * Test: Non-super-admin user returns 403 Forbidden
   * Validates: Requirements 7.1, 7.4
   */
  test('returns 403 when user is not super admin', async () => {
    const { validateSession } = require('@/lib/session');

    // Create a regular user (not super admin)
    const regularUser = await prisma.user.create({
      data: {
        email: 'regular@test.com',
        name: 'Regular User',
      },
    });

    try {
      // Mock validateSession to return regular user session
      validateSession.mockResolvedValue({
        userId: regularUser.id,
        activeProjectId: null,
      });

      // Set super admin emails (not including regular user)
      const originalEnv = process.env.SUPER_ADMIN_EMAILS;
      process.env.SUPER_ADMIN_EMAILS = 'superadmin@test.com';

      const request = new NextRequest('http://localhost/api/super-admin/access-project', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');

      // Restore environment
      process.env.SUPER_ADMIN_EMAILS = originalEnv;
    } finally {
      await prisma.user.delete({
        where: { id: regularUser.id },
      }).catch(() => {});
    }
  });

  /**
   * Test: Invalid project ID returns 404 Not Found
   * Validates: Requirements 2.1
   */
  test('returns 404 when project does not exist', async () => {
    const { validateSession, createAccessSimulationSession } = require('@/lib/session');

    // Mock validateSession to return super admin session
    validateSession.mockResolvedValue({
      userId: testUser.id,
      activeProjectId: null,
    });

    // Set super admin email
    const originalEnv = process.env.SUPER_ADMIN_EMAILS;
    process.env.SUPER_ADMIN_EMAILS = testUser.email;

    // Use a non-existent project ID
    const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({ projectId: nonExistentProjectId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');

    // Verify createAccessSimulationSession was NOT called
    expect(createAccessSimulationSession).not.toHaveBeenCalled();

    // Restore environment
    process.env.SUPER_ADMIN_EMAILS = originalEnv;
  });

  /**
   * Test: Missing projectId in request body returns 400 Bad Request
   * Validates: Requirements 2.1
   */
  test('returns 400 when projectId is missing', async () => {
    const { validateSession } = require('@/lib/session');

    // Mock validateSession to return super admin session
    validateSession.mockResolvedValue({
      userId: testUser.id,
      activeProjectId: null,
    });

    // Set super admin email
    const originalEnv = process.env.SUPER_ADMIN_EMAILS;
    process.env.SUPER_ADMIN_EMAILS = testUser.email;

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({}), // Missing projectId
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID is required');

    // Restore environment
    process.env.SUPER_ADMIN_EMAILS = originalEnv;
  });

  /**
   * Test: Invalid projectId type returns 400 Bad Request
   * Validates: Requirements 2.1
   */
  test('returns 400 when projectId is not a string', async () => {
    const { validateSession } = require('@/lib/session');

    // Mock validateSession to return super admin session
    validateSession.mockResolvedValue({
      userId: testUser.id,
      activeProjectId: null,
    });

    // Set super admin email
    const originalEnv = process.env.SUPER_ADMIN_EMAILS;
    process.env.SUPER_ADMIN_EMAILS = testUser.email;

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({ projectId: 123 }), // Invalid type
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID is required');

    // Restore environment
    process.env.SUPER_ADMIN_EMAILS = originalEnv;
  });

  /**
   * Test: Successful access simulation creates audit log
   * Validates: Requirements 2.5
   */
  test('creates audit log on successful access simulation', async () => {
    const { validateSession, createAccessSimulationSession } = require('@/lib/session');

    // Mock validateSession to return super admin session
    validateSession.mockResolvedValue({
      userId: testUser.id,
      activeProjectId: null,
    });

    // Mock createAccessSimulationSession
    createAccessSimulationSession.mockResolvedValue(undefined);

    // Set super admin email
    const originalEnv = process.env.SUPER_ADMIN_EMAILS;
    process.env.SUPER_ADMIN_EMAILS = testUser.email;

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({ projectId: testProject.id }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: testUser.id,
        projectId: testProject.id,
      },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe('super_admin.access_simulation.start');

    // Restore environment
    process.env.SUPER_ADMIN_EMAILS = originalEnv;
  });

  /**
   * Test: User not found returns 404
   * Validates: Requirements 7.1
   */
  test('returns 404 when user does not exist', async () => {
    const { validateSession } = require('@/lib/session');

    // Mock validateSession to return session with non-existent user ID
    validateSession.mockResolvedValue({
      userId: '00000000-0000-0000-0000-000000000000',
      activeProjectId: null,
    });

    const request = new NextRequest('http://localhost/api/super-admin/access-project', {
      method: 'POST',
      body: JSON.stringify({ projectId: testProject.id }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });
});
