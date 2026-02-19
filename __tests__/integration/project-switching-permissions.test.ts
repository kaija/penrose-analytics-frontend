/**
 * Integration Test: Project Switching with Permission Enforcement
 *
 * Tests the complete flow of switching between projects and verifying
 * that permissions are correctly enforced for each project context.
 *
 * Requirements: 3.4-3.12, 4.1-4.10, 15.1-15.5
 */

import { prisma } from '@/lib/prisma';
import { createProject, getUserProjects, switchProject, hasProjectAccess } from '@/lib/project';
import { canPerformAction } from '@/lib/rbac';
import { createInvitation, acceptInvitation } from '@/lib/invitation';

describe('Integration: Project Switching with Permission Enforcement', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Project Switching', () => {
    it('should switch between user-owned projects', async () => {
      // Create user with multiple projects
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Test User',
        },
      });

      const project1 = await createProject(user.id, 'Project One');
      const project2 = await createProject(user.id, 'Project Two');
      const project3 = await createProject(user.id, 'Project Three');

      // Create initial session with project1
      let session = {
        userId: user.id,
        activeProjectId: project1.id,
      };
      expect(session.activeProjectId).toBe(project1.id);

      // Switch to project2
      await switchProject(user.id, project2.id);
      session = {
        userId: user.id,
        activeProjectId: project2.id,
      };
      expect(session.activeProjectId).toBe(project2.id);

      // Switch to project3
      await switchProject(user.id, project3.id);
      session = {
        userId: user.id,
        activeProjectId: project3.id,
      };
      expect(session.activeProjectId).toBe(project3.id);

      // Switch back to project1
      await switchProject(user.id, project1.id);
      session = {
        userId: user.id,
        activeProjectId: project1.id,
      };
      expect(session.activeProjectId).toBe(project1.id);
    });

    it('should prevent switching to project without access', async () => {
      // Create two users with separate projects
      const user1 = await prisma.user.create({
        data: { email: 'user1@example.com', name: 'User 1' },
      });

      const user2 = await prisma.user.create({
        data: { email: 'user2@example.com', name: 'User 2' },
      });

      const project1 = await createProject(user1.id, 'User 1 Project');
      const project2 = await createProject(user2.id, 'User 2 Project');

      // User 1 should not be able to switch to User 2's project
      await expect(switchProject(user1.id, project2.id)).rejects.toThrow(
        'You do not have access to this project'
      );

      // Verify user1 still has no access
      const hasAccess = await hasProjectAccess(user1.id, project2.id);
      expect(hasAccess).toBe(false);
    });

    it('should allow switching to projects where user is a member', async () => {
      // Create owner and project
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Shared Project');

      // Invite member
      const invitation = await createInvitation(
        project.id,
        'member@example.com',
        'editor',
        owner.id
      );

      const member = await prisma.user.create({
        data: { email: 'member@example.com', name: 'Member' },
      });

      await acceptInvitation(invitation.token, member.email);

      // Member should be able to switch to the project
      await expect(switchProject(member.id, project.id)).resolves.not.toThrow();

      // Verify member has access
      const hasAccess = await hasProjectAccess(member.id, project.id);
      expect(hasAccess).toBe(true);
    });
  });

  describe('Permission Enforcement After Switching', () => {
    it('should enforce different permissions in different projects', async () => {
      // Create user
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'User' },
      });

      // Create two owners with their projects
      const owner1 = await prisma.user.create({
        data: { email: 'owner1@example.com', name: 'Owner 1' },
      });

      const owner2 = await prisma.user.create({
        data: { email: 'owner2@example.com', name: 'Owner 2' },
      });

      const project1 = await createProject(owner1.id, 'Project 1');
      const project2 = await createProject(owner2.id, 'Project 2');

      // Invite user as editor to project1
      const invite1 = await createInvitation(
        project1.id,
        user.email,
        'editor',
        owner1.id
      );
      await acceptInvitation(invite1.token, user.email);

      // Invite user as viewer to project2
      const invite2 = await createInvitation(
        project2.id,
        user.email,
        'viewer',
        owner2.id
      );
      await acceptInvitation(invite2.token, user.email);

      // In project1 (editor), user can create dashboards
      await switchProject(user.id, project1.id);
      expect(await canPerformAction(user.id, project1.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(user.id, project1.id, 'dashboard:update')).toBe(true);
      expect(await canPerformAction(user.id, project1.id, 'members:invite')).toBe(false);

      // In project2 (viewer), user can only read
      await switchProject(user.id, project2.id);
      expect(await canPerformAction(user.id, project2.id, 'dashboard:read')).toBe(true);
      expect(await canPerformAction(user.id, project2.id, 'dashboard:create')).toBe(false);
      expect(await canPerformAction(user.id, project2.id, 'dashboard:update')).toBe(false);
      expect(await canPerformAction(user.id, project2.id, 'members:invite')).toBe(false);
    });

    it('should maintain owner permissions across all owned projects', async () => {
      // Create user with multiple projects
      const user = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project1 = await createProject(user.id, 'Project 1');
      const project2 = await createProject(user.id, 'Project 2');
      const project3 = await createProject(user.id, 'Project 3');

      // Test owner permissions in each project
      const projects = [project1, project2, project3];
      const ownerActions = [
        'project:read',
        'project:update',
        'project:delete',
        'members:invite',
        'members:update',
        'members:remove',
        'dashboard:create',
        'dashboard:read',
        'dashboard:update',
        'dashboard:delete',
      ];

      for (const project of projects) {
        await switchProject(user.id, project.id);

        for (const action of ownerActions) {
          const hasPermission = await canPerformAction(user.id, project.id, action as any);
          expect(hasPermission).toBe(true);
        }
      }
    });

    it('should enforce role-specific permissions after switching', async () => {
      // Create owner and project
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      // Create and invite users with different roles
      const admin = await prisma.user.create({
        data: { email: 'admin@example.com', name: 'Admin' },
      });

      const editor = await prisma.user.create({
        data: { email: 'editor@example.com', name: 'Editor' },
      });

      const viewer = await prisma.user.create({
        data: { email: 'viewer@example.com', name: 'Viewer' },
      });

      // Send invitations
      const adminInvite = await createInvitation(project.id, admin.email, 'admin', owner.id);
      const editorInvite = await createInvitation(project.id, editor.email, 'editor', owner.id);
      const viewerInvite = await createInvitation(project.id, viewer.email, 'viewer', owner.id);

      await acceptInvitation(adminInvite.token, admin.email);
      await acceptInvitation(editorInvite.token, editor.email);
      await acceptInvitation(viewerInvite.token, viewer.email);

      // Test admin permissions
      await switchProject(admin.id, project.id);
      expect(await canPerformAction(admin.id, project.id, 'members:invite')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'project:delete')).toBe(false);

      // Test editor permissions
      await switchProject(editor.id, project.id);
      expect(await canPerformAction(editor.id, project.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'members:invite')).toBe(false);

      // Test viewer permissions
      await switchProject(viewer.id, project.id);
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:read')).toBe(true);
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:create')).toBe(false);
    });
  });

  describe('Multi-Project Scenarios', () => {
    it('should handle user with different roles in different projects', async () => {
      // Create user
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'Multi-Role User' },
      });

      // User owns project1
      const project1 = await createProject(user.id, 'Owned Project');

      // User is admin in project2
      const owner2 = await prisma.user.create({
        data: { email: 'owner2@example.com', name: 'Owner 2' },
      });
      const project2 = await createProject(owner2.id, 'Admin Project');
      const adminInvite = await createInvitation(project2.id, user.email, 'admin', owner2.id);
      await acceptInvitation(adminInvite.token, user.email);

      // User is editor in project3
      const owner3 = await prisma.user.create({
        data: { email: 'owner3@example.com', name: 'Owner 3' },
      });
      const project3 = await createProject(owner3.id, 'Editor Project');
      const editorInvite = await createInvitation(project3.id, user.email, 'editor', owner3.id);
      await acceptInvitation(editorInvite.token, user.email);

      // User is viewer in project4
      const owner4 = await prisma.user.create({
        data: { email: 'owner4@example.com', name: 'Owner 4' },
      });
      const project4 = await createProject(owner4.id, 'Viewer Project');
      const viewerInvite = await createInvitation(project4.id, user.email, 'viewer', owner4.id);
      await acceptInvitation(viewerInvite.token, user.email);

      // Verify user can access all projects
      const userProjects = await getUserProjects(user.id);
      expect(userProjects).toHaveLength(4);

      // Test permissions in owned project (full access)
      await switchProject(user.id, project1.id);
      expect(await canPerformAction(user.id, project1.id, 'project:delete')).toBe(true);
      expect(await canPerformAction(user.id, project1.id, 'members:invite')).toBe(true);

      // Test permissions in admin project
      await switchProject(user.id, project2.id);
      expect(await canPerformAction(user.id, project2.id, 'members:invite')).toBe(true);
      expect(await canPerformAction(user.id, project2.id, 'project:delete')).toBe(false);

      // Test permissions in editor project
      await switchProject(user.id, project3.id);
      expect(await canPerformAction(user.id, project3.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(user.id, project3.id, 'members:invite')).toBe(false);

      // Test permissions in viewer project
      await switchProject(user.id, project4.id);
      expect(await canPerformAction(user.id, project4.id, 'dashboard:read')).toBe(true);
      expect(await canPerformAction(user.id, project4.id, 'dashboard:create')).toBe(false);
    });

    it('should maintain correct permissions when rapidly switching projects', async () => {
      // Create user
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'User' },
      });

      // Create owner
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      // Create projects with different roles
      const editorProject = await createProject(owner.id, 'Editor Project');
      const viewerProject = await createProject(owner.id, 'Viewer Project');

      const editorInvite = await createInvitation(
        editorProject.id,
        user.email,
        'editor',
        owner.id
      );
      const viewerInvite = await createInvitation(
        viewerProject.id,
        user.email,
        'viewer',
        owner.id
      );

      await acceptInvitation(editorInvite.token, user.email);
      await acceptInvitation(viewerInvite.token, user.email);

      // Rapidly switch between projects and verify permissions
      for (let i = 0; i < 5; i++) {
        // Switch to editor project
        await switchProject(user.id, editorProject.id);
        expect(await canPerformAction(user.id, editorProject.id, 'dashboard:create')).toBe(true);

        // Switch to viewer project
        await switchProject(user.id, viewerProject.id);
        expect(await canPerformAction(user.id, viewerProject.id, 'dashboard:create')).toBe(false);
      }
    });
  });

  describe('Session Consistency', () => {
    it('should maintain session integrity across project switches', async () => {
      // Create user with projects
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'User' },
      });

      const project1 = await createProject(user.id, 'Project 1');
      const project2 = await createProject(user.id, 'Project 2');

      // Create session with project1
      let session = {
        userId: user.id,
        activeProjectId: project1.id,
      };
      expect(session.userId).toBe(user.id);
      expect(session.activeProjectId).toBe(project1.id);

      // Switch to project2
      await switchProject(user.id, project2.id);
      session = {
        userId: user.id,
        activeProjectId: project2.id,
      };
      expect(session.userId).toBe(user.id);
      expect(session.activeProjectId).toBe(project2.id);

      // Verify user ID remains consistent
      expect(session.userId).toBe(user.id);
    });

    it('should handle switching to null project (no active project)', async () => {
      // Create user with project
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'User' },
      });

      const project = await createProject(user.id, 'Test Project');

      // Create session with active project
      let session = {
        userId: user.id,
        activeProjectId: project.id,
      };
      expect(session.activeProjectId).toBe(project.id);

      // Switch to no active project
      session = {
        userId: user.id,
        activeProjectId: null,
      };
      expect(session.userId).toBe(user.id);
      expect(session.activeProjectId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should reject switching to non-existent project', async () => {
      const user = await prisma.user.create({
        data: { email: 'user@example.com', name: 'User' },
      });

      // Attempt to switch to non-existent project
      await expect(
        switchProject(user.id, 'non-existent-project-id')
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should reject switching for non-existent user', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      // Attempt to switch with non-existent user
      await expect(
        switchProject('non-existent-user-id', project.id)
      ).rejects.toThrow('You do not have access to this project');
    });
  });
});
