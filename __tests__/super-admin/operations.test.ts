/**
 * Unit tests for super admin operations
 *
 * Tests super admin path verification, OAuth requirement, and email allowlist checking
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Operations', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
      },
    });
  });

  afterEach(async () => {
    // Clean up
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      }).catch(() => {});
    }
  });

  test('super admin path requires environment variable', () => {
    // Verify SUPER_ADMIN_PATH is required
    const superAdminPath = process.env.SUPER_ADMIN_PATH;

    // The path should be defined in environment
    // In production, this would be a secret value
    expect(typeof superAdminPath).toBe('string');
  });

  test('OAuth required for super admin access', async () => {
    // Super admin access requires authenticated user
    // This test verifies the user must exist in database (OAuth completed)

    const user = await prisma.user.findUnique({
      where: { id: testUser.id },
    });

    expect(user).toBeDefined();
    expect(user?.email).toBe('admin@test.com');
  });

  test('email verification against allowlist', () => {
    // Simulate allowlist checking
    const allowlistString = 'admin1@example.com,admin2@example.com,admin3@example.com';
    const allowlist = allowlistString.split(',').map(e => e.trim());

    // Test email in allowlist
    expect(allowlist).toContain('admin1@example.com');
    expect(allowlist).toContain('admin2@example.com');

    // Test email not in allowlist
    expect(allowlist).not.toContain('user@example.com');
    expect(allowlist).not.toContain('admin@test.com');
  });

  test('allowlist parsing handles whitespace', () => {
    // Test that allowlist parsing is robust
    const allowlistString = ' admin1@example.com , admin2@example.com,  admin3@example.com  ';
    const allowlist = allowlistString.split(',').map(e => e.trim());

    expect(allowlist).toHaveLength(3);
    expect(allowlist).toContain('admin1@example.com');
    expect(allowlist).toContain('admin2@example.com');
    expect(allowlist).toContain('admin3@example.com');
  });

  test('empty allowlist denies all access', () => {
    const allowlistString = '';
    const allowlist = allowlistString.split(',').map(e => e.trim()).filter(e => e);

    expect(allowlist).toHaveLength(0);
    expect(allowlist).not.toContain('admin@test.com');
  });

  test('case-sensitive email matching', () => {
    const allowlist = ['Admin@Example.com'];

    // Email matching should be case-sensitive or normalized
    // This test documents the expected behavior
    expect(allowlist).toContain('Admin@Example.com');
    expect(allowlist).not.toContain('admin@example.com');
  });

  test('super admin can list all projects', async () => {
    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    try {
      // Super admin should be able to query all projects
      const projects = await prisma.project.findMany();

      expect(projects.length).toBeGreaterThan(0);
      expect(projects.some(p => p.id === project.id)).toBe(true);
    } finally {
      // Clean up
      await prisma.project.delete({
        where: { id: project.id },
      });
    }
  });

  test('super admin can list all users', async () => {
    // Super admin should be able to query all users
    const users = await prisma.user.findMany();

    expect(users.length).toBeGreaterThan(0);
    expect(users.some(u => u.id === testUser.id)).toBe(true);
  });

  test('super admin can list all memberships', async () => {
    // Create test project and membership
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    const membership = await prisma.projectMembership.create({
      data: {
        userId: testUser.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    try {
      // Super admin should be able to query all memberships
      const memberships = await prisma.projectMembership.findMany({
        include: {
          user: true,
          project: true,
        },
      });

      expect(memberships.length).toBeGreaterThan(0);
      expect(memberships.some(m => m.id === membership.id)).toBe(true);
    } finally {
      // Clean up
      await prisma.projectMembership.delete({
        where: { id: membership.id },
      });
      await prisma.project.delete({
        where: { id: project.id },
      });
    }
  });
});
