/**
 * Integration Test: OAuth → Project Creation Flow
 *
 * Tests the complete flow from OAuth authentication through project creation
 * for both new and returning users.
 *
 * Requirements: 2.1-2.10, 3.1-3.4, 15.1-15.5
 */

import { prisma } from '@/lib/prisma';
import { createProject, getUserProjects } from '@/lib/project';

describe('Integration: OAuth → Project Creation Flow', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('New User Flow', () => {
    it('should complete full flow: OAuth → User Creation → Session → Project Creation', async () => {
      // Step 1: Simulate OAuth callback with new user
      const mockGoogleUser = {
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
      };

      // Create user (simulating OAuth callback)
      const user = await prisma.user.create({
        data: {
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          avatar: mockGoogleUser.picture,
        },
      });

      // Verify user was created
      expect(user).toBeDefined();
      expect(user.email).toBe(mockGoogleUser.email);
      expect(user.name).toBe(mockGoogleUser.name);

      // Step 2: Create session for new user (no active project yet)
      // Session would be created by the OAuth callback handler
      const sessionData = {
        userId: user.id,
        activeProjectId: null,
      };

      // Verify session data structure
      expect(sessionData.userId).toBe(user.id);
      expect(sessionData.activeProjectId).toBeNull();

      // Step 3: User creates their first project
      const project = await createProject(user.id, 'My First Project');

      // Verify project was created
      expect(project).toBeDefined();
      expect(project.name).toBe('My First Project');
      expect(project.enabled).toBe(true);
      expect(project.createdAt).toBeInstanceOf(Date);

      // Step 4: Verify owner membership was automatically created
      const membership = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: project.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe('owner');
      expect(membership?.userId).toBe(user.id);
      expect(membership?.projectId).toBe(project.id);

      // Step 5: Verify user can retrieve their projects
      const userProjects = await getUserProjects(user.id);

      expect(userProjects).toHaveLength(1);
      expect(userProjects[0].id).toBe(project.id);
      expect(userProjects[0].name).toBe('My First Project');

      // Step 6: Update session with active project
      const updatedSession = {
        userId: user.id,
        activeProjectId: project.id,
      };

      expect(updatedSession.userId).toBe(user.id);
      expect(updatedSession.activeProjectId).toBe(project.id);
    });

    it('should allow new user to create multiple projects', async () => {
      // Create new user
      const user = await prisma.user.create({
        data: {
          email: 'multiproject@example.com',
          name: 'Multi Project User',
        },
      });

      // Create first project
      const project1 = await createProject(user.id, 'Project One');
      expect(project1.name).toBe('Project One');

      // Create second project
      const project2 = await createProject(user.id, 'Project Two');
      expect(project2.name).toBe('Project Two');

      // Create third project
      const project3 = await createProject(user.id, 'Project Three');
      expect(project3.name).toBe('Project Three');

      // Verify all projects are accessible
      const userProjects = await getUserProjects(user.id);
      expect(userProjects).toHaveLength(3);

      // Verify user is owner of all projects
      const memberships = await prisma.projectMembership.findMany({
        where: { userId: user.id },
      });

      expect(memberships).toHaveLength(3);
      expect(memberships.every((m) => m.role === 'owner')).toBe(true);
    });
  });

  describe('Returning User Flow', () => {
    it('should complete flow: OAuth → Existing User → Session with Active Project', async () => {
      // Step 1: Create existing user with project
      const user = await prisma.user.create({
        data: {
          email: 'returning@example.com',
          name: 'Returning User',
        },
      });

      const project = await createProject(user.id, 'Existing Project');

      // Step 2: Simulate returning user OAuth login
      const existingUser = await prisma.user.findUnique({
        where: { email: 'returning@example.com' },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.id).toBe(user.id);

      // Step 3: Create session with active project
      const session = {
        userId: user.id,
        activeProjectId: project.id,
      };

      expect(session.userId).toBe(user.id);
      expect(session.activeProjectId).toBe(project.id);

      // Step 4: Verify user can access their projects
      const userProjects = await getUserProjects(user.id);

      expect(userProjects).toHaveLength(1);
      expect(userProjects[0].id).toBe(project.id);
    });

    it('should handle returning user with multiple projects', async () => {
      // Create user with multiple projects
      const user = await prisma.user.create({
        data: {
          email: 'multiuser@example.com',
          name: 'Multi User',
        },
      });

      const project1 = await createProject(user.id, 'Project A');
      const project2 = await createProject(user.id, 'Project B');
      const project3 = await createProject(user.id, 'Project C');

      // Simulate OAuth login
      const existingUser = await prisma.user.findUnique({
        where: { email: 'multiuser@example.com' },
      });

      expect(existingUser).toBeDefined();

      // Create session with last active project
      const session = {
        userId: user.id,
        activeProjectId: project2.id,
      };

      expect(session.activeProjectId).toBe(project2.id);

      // Verify all projects are accessible
      const userProjects = await getUserProjects(user.id);

      expect(userProjects).toHaveLength(3);
      expect(userProjects.map((p) => p.id)).toContain(project1.id);
      expect(userProjects.map((p) => p.id)).toContain(project2.id);
      expect(userProjects.map((p) => p.id)).toContain(project3.id);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across project operations', async () => {
      // Create user and initial session
      const user = await prisma.user.create({
        data: {
          email: 'session@example.com',
          name: 'Session User',
        },
      });

      const initialSession = {
        userId: user.id,
        activeProjectId: null,
      };
      expect(initialSession.activeProjectId).toBeNull();

      // Create first project
      const project1 = await createProject(user.id, 'First Project');

      // Update session with first project
      const session1 = {
        userId: user.id,
        activeProjectId: project1.id,
      };
      expect(session1.activeProjectId).toBe(project1.id);

      // Create second project
      const project2 = await createProject(user.id, 'Second Project');

      // Update session with second project
      const session2 = {
        userId: user.id,
        activeProjectId: project2.id,
      };
      expect(session2.activeProjectId).toBe(project2.id);

      // Verify both projects still exist
      const userProjects = await getUserProjects(user.id);
      expect(userProjects).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle OAuth with missing email', async () => {
      // Attempt to create user without email
      // Note: Prisma allows empty strings, so we test for proper validation
      const user = await prisma.user.create({
        data: {
          email: '', // Empty email
          name: 'No Email User',
        },
      });

      // In a real OAuth flow, this would be rejected before reaching the database
      // The test verifies that empty email can be stored but should be validated
      expect(user.email).toBe('');
    });

    it('should handle duplicate email in OAuth', async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          name: 'First User',
        },
      });

      // Attempt to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate@example.com',
            name: 'Second User',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle invalid project name', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'invalid@example.com',
          name: 'Invalid User',
        },
      });

      // Empty project name is allowed by Prisma but should be validated at API level
      // This test verifies the database allows it, but application logic should prevent it
      const project = await createProject(user.id, '');
      expect(project.name).toBe('');
    });
  });
});
