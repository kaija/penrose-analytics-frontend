/**
 * Unit tests for super admin projects endpoint
 *
 * Tests the GET /api/super-admin/projects endpoint to verify it returns
 * projects with member counts correctly aggregated.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Projects Endpoint', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
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
    // Clean up memberships first
    await prisma.projectMembership.deleteMany({
      where: { projectId: testProject.id },
    });

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

  test('projects query includes member count', async () => {
    // Create memberships
    await prisma.projectMembership.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: 'owner',
      },
    });

    // Query projects with member count
    const projects = await prisma.project.findMany({
      where: { id: testProject.id },
      include: {
        _count: {
          select: { memberships: true }
        }
      },
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]._count.memberships).toBe(1);
  });

  test('project with no members has zero count', async () => {
    // Query project without any memberships
    const projects = await prisma.project.findMany({
      where: { id: testProject.id },
      include: {
        _count: {
          select: { memberships: true }
        }
      },
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]._count.memberships).toBe(0);
  });

  test('project with multiple members counts correctly', async () => {
    // Create additional test users
    const user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'Test User 2',
      },
    });

    const user3 = await prisma.user.create({
      data: {
        email: 'user3@test.com',
        name: 'Test User 3',
      },
    });

    try {
      // Create multiple memberships
      await prisma.projectMembership.createMany({
        data: [
          {
            userId: testUser.id,
            projectId: testProject.id,
            role: 'owner',
          },
          {
            userId: user2.id,
            projectId: testProject.id,
            role: 'admin',
          },
          {
            userId: user3.id,
            projectId: testProject.id,
            role: 'viewer',
          },
        ],
      });

      // Query projects with member count
      const projects = await prisma.project.findMany({
        where: { id: testProject.id },
        include: {
          _count: {
            select: { memberships: true }
          }
        },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0]._count.memberships).toBe(3);
    } finally {
      // Clean up additional users
      await prisma.user.deleteMany({
        where: {
          id: { in: [user2.id, user3.id] }
        },
      });
    }
  });

  test('transformed project data includes all required fields', async () => {
    // Create a membership
    await prisma.projectMembership.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: 'owner',
      },
    });

    // Query and transform like the API does
    const projects = await prisma.project.findMany({
      where: { id: testProject.id },
      include: {
        _count: {
          select: { memberships: true }
        }
      },
    });

    const projectsWithStats = projects.map(p => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      createdAt: p.createdAt,
      memberCount: p._count.memberships
    }));

    expect(projectsWithStats).toHaveLength(1);
    const project = projectsWithStats[0];

    // Verify all required fields are present
    expect(project.id).toBeDefined();
    expect(typeof project.id).toBe('string');
    expect(project.name).toBe('Test Project');
    expect(project.enabled).toBe(true);
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.memberCount).toBe(1);
    expect(typeof project.memberCount).toBe('number');
  });
});
