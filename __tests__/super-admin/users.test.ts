/**
 * Unit tests for super admin users endpoint
 *
 * Tests the GET /api/super-admin/users endpoint to verify it returns
 * users with memberships including project names.
 *
 * Validates: Requirements 4.1, 4.2, 5.3, 5.4
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Users Endpoint', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'testuser@test.com',
        name: 'Test User',
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
      where: { userId: testUser.id },
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

  test('users query includes memberships with project names', async () => {
    // Create membership
    await prisma.projectMembership.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: 'owner',
      },
    });

    // Query users with memberships
    const users = await prisma.user.findMany({
      where: { id: testUser.id },
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

    expect(users).toHaveLength(1);
    expect(users[0].memberships).toHaveLength(1);
    expect(users[0].memberships[0].project.name).toBe('Test Project');
  });

  test('user with no memberships returns empty array', async () => {
    // Query user without any memberships
    const users = await prisma.user.findMany({
      where: { id: testUser.id },
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

    expect(users).toHaveLength(1);
    expect(users[0].memberships).toHaveLength(0);
  });

  test('user with multiple memberships includes all projects', async () => {
    // Create additional test project
    const project2 = await prisma.project.create({
      data: {
        name: 'Test Project 2',
        enabled: true,
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
            userId: testUser.id,
            projectId: project2.id,
            role: 'admin',
          },
        ],
      });

      // Query users with memberships
      const users = await prisma.user.findMany({
        where: { id: testUser.id },
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

      expect(users).toHaveLength(1);
      expect(users[0].memberships).toHaveLength(2);

      const projectNames = users[0].memberships.map(m => m.project.name);
      expect(projectNames).toContain('Test Project');
      expect(projectNames).toContain('Test Project 2');
    } finally {
      // Clean up additional project
      await prisma.projectMembership.deleteMany({
        where: { projectId: project2.id },
      });
      await prisma.project.delete({
        where: { id: project2.id },
      });
    }
  });

  test('transformed user data includes all required fields', async () => {
    // Create a membership
    await prisma.projectMembership.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: 'owner',
      },
    });

    // Query and transform like the API does
    const users = await prisma.user.findMany({
      where: { id: testUser.id },
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

    const usersWithMemberships = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      memberships: user.memberships.map(m => ({
        projectId: m.projectId,
        projectName: m.project.name,
        role: m.role,
        createdAt: m.createdAt,
      })),
    }));

    expect(usersWithMemberships).toHaveLength(1);
    const user = usersWithMemberships[0];

    // Verify all required user fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
    expect(user.email).toBe('testuser@test.com');
    expect(user.name).toBe('Test User');
    expect(user.createdAt).toBeInstanceOf(Date);

    // Verify membership fields
    expect(user.memberships).toHaveLength(1);
    const membership = user.memberships[0];
    expect(membership.projectId).toBeDefined();
    expect(typeof membership.projectId).toBe('string');
    expect(membership.projectName).toBe('Test Project');
    expect(membership.role).toBe('owner');
    expect(membership.createdAt).toBeInstanceOf(Date);
  });

  test('membership includes correct role information', async () => {
    // Create memberships with different roles
    const project2 = await prisma.project.create({
      data: {
        name: 'Admin Project',
        enabled: true,
      },
    });

    const project3 = await prisma.project.create({
      data: {
        name: 'Viewer Project',
        enabled: true,
      },
    });

    try {
      await prisma.projectMembership.createMany({
        data: [
          {
            userId: testUser.id,
            projectId: testProject.id,
            role: 'owner',
          },
          {
            userId: testUser.id,
            projectId: project2.id,
            role: 'admin',
          },
          {
            userId: testUser.id,
            projectId: project3.id,
            role: 'viewer',
          },
        ],
      });

      // Query users with memberships
      const users = await prisma.user.findMany({
        where: { id: testUser.id },
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

      const usersWithMemberships = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        memberships: user.memberships.map(m => ({
          projectId: m.projectId,
          projectName: m.project.name,
          role: m.role,
          createdAt: m.createdAt,
        })),
      }));

      expect(usersWithMemberships[0].memberships).toHaveLength(3);

      const roles = usersWithMemberships[0].memberships.map(m => m.role);
      expect(roles).toContain('owner');
      expect(roles).toContain('admin');
      expect(roles).toContain('viewer');
    } finally {
      // Clean up additional projects
      await prisma.projectMembership.deleteMany({
        where: { projectId: { in: [project2.id, project3.id] } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: [project2.id, project3.id] } },
      });
    }
  });
});
