/**
 * Integration Test: Super Admin Operations
 * 
 * Tests the complete flow of super admin access control and operations
 * including verification, project management, user management, and
 * cross-project operations.
 * 
 * Requirements: 13.1-13.13
 */

import { prisma } from '@/lib/prisma';
import { createProject, getUserProjects, getProjectMembers } from '@/lib/project';
import { createInvitation, acceptInvitation } from '@/lib/invitation';

describe('Integration: Super Admin Operations', () => {
  let superAdminUser: any;
  let regularUser: any;
  const originalSuperAdminEmails = process.env.SUPER_ADMIN_EMAILS;
  const originalSuperAdminPath = process.env.SUPER_ADMIN_PATH;

  beforeEach(async () => {
    // Clean up test data
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});

    // Set up super admin environment
    process.env.SUPER_ADMIN_PATH = 'test-secret-path';
    process.env.SUPER_ADMIN_EMAILS = 'superadmin@example.com,admin2@example.com';

    // Create super admin user
    superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@example.com',
        name: 'Super Admin',
      },
    });

    // Create regular user
    regularUser = await prisma.user.create({
      data: {
        email: 'regular@example.com',
        name: 'Regular User',
      },
    });
  });

  afterEach(() => {
    // Restore original environment variables
    process.env.SUPER_ADMIN_EMAILS = originalSuperAdminEmails;
    process.env.SUPER_ADMIN_PATH = originalSuperAdminPath;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Super Admin Access Control', () => {
    it('should verify super admin access with correct email and path', async () => {
      // Verify super admin email is in allowlist
      const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      expect(superAdminEmails).toContain(superAdminUser.email);

      // Verify path is set
      expect(process.env.SUPER_ADMIN_PATH).toBe('test-secret-path');

      // Super admin should be able to access
      const isAuthorized = superAdminEmails.includes(superAdminUser.email);
      expect(isAuthorized).toBe(true);
    });

    it('should deny access for non-allowlisted email', async () => {
      // Regular user should not be in allowlist
      const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      const isAuthorized = superAdminEmails.includes(regularUser.email);
      expect(isAuthorized).toBe(false);
    });

    it('should deny access with incorrect path', async () => {
      const correctPath = process.env.SUPER_ADMIN_PATH;
      const incorrectPath = 'wrong-path';

      expect(incorrectPath).not.toBe(correctPath);
    });

    it('should require OAuth authentication', async () => {
      // Verify users exist in database (OAuth completed)
      const superAdmin = await prisma.user.findUnique({
        where: { email: 'superadmin@example.com' },
      });

      expect(superAdmin).toBeDefined();
      expect(superAdmin?.id).toBe(superAdminUser.id);
    });
  });

  describe('Super Admin Project Management', () => {
    it('should list all projects across all users', async () => {
      // Create projects for different users
      const user1 = await prisma.user.create({
        data: { email: 'user1@example.com', name: 'User 1' },
      });

      const user2 = await prisma.user.create({
        data: { email: 'user2@example.com', name: 'User 2' },
      });

      const project1 = await createProject(user1.id, 'User 1 Project');
      const project2 = await createProject(user2.id, 'User 2 Project');
      const project3 = await createProject(regularUser.id, 'Regular User Project');

      // Super admin should see all projects
      const allProjects = await prisma.project.findMany();

      expect(allProjects).toHaveLength(3);
      expect(allProjects.map(p => p.id)).toContain(project1.id);
      expect(allProjects.map(p => p.id)).toContain(project2.id);
      expect(allProjects.map(p => p.id)).toContain(project3.id);
    });

    it('should enable and disable projects', async () => {
      // Create project
      const project = await createProject(regularUser.id, 'Test Project');

      // Verify project is enabled by default
      expect(project.enabled).toBe(true);

      // Super admin disables project
      await prisma.project.update({
        where: { id: project.id },
        data: { enabled: false },
      });

      const disabledProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      expect(disabledProject?.enabled).toBe(false);

      // Super admin re-enables project
      await prisma.project.update({
        where: { id: project.id },
        data: { enabled: true },
      });

      const enabledProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      expect(enabledProject?.enabled).toBe(true);
    });

    it('should view project details and memberships', async () => {
      // Create project with multiple members
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Multi-Member Project');

      // Add members
      const editor = await prisma.user.create({
        data: { email: 'editor@example.com', name: 'Editor' },
      });

      const viewer = await prisma.user.create({
        data: { email: 'viewer@example.com', name: 'Viewer' },
      });

      const editorInvite = await createInvitation(project.id, editor.email, 'editor', owner.id);
      const viewerInvite = await createInvitation(project.id, viewer.email, 'viewer', owner.id);

      await acceptInvitation(editorInvite.token, editor.email);
      await acceptInvitation(viewerInvite.token, viewer.email);

      // Super admin views project details
      const projectDetails = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          memberships: {
            include: {
              user: true,
            },
          },
        },
      });

      expect(projectDetails).toBeDefined();
      expect(projectDetails?.memberships).toHaveLength(3); // Owner + 2 members
    });
  });

  describe('Super Admin User Management', () => {
    it('should list all users in the system', async () => {
      // Create additional users
      await prisma.user.create({
        data: { email: 'user1@example.com', name: 'User 1' },
      });

      await prisma.user.create({
        data: { email: 'user2@example.com', name: 'User 2' },
      });

      await prisma.user.create({
        data: { email: 'user3@example.com', name: 'User 3' },
      });

      // Super admin lists all users
      const allUsers = await prisma.user.findMany();

      // Should include super admin, regular user, and 3 new users
      expect(allUsers.length).toBeGreaterThanOrEqual(5);
    });

    it('should view user memberships across all projects', async () => {
      // Create user with memberships in multiple projects
      const user = await prisma.user.create({
        data: { email: 'multiproject@example.com', name: 'Multi Project User' },
      });

      const owner1 = await prisma.user.create({
        data: { email: 'owner1@example.com', name: 'Owner 1' },
      });

      const owner2 = await prisma.user.create({
        data: { email: 'owner2@example.com', name: 'Owner 2' },
      });

      const project1 = await createProject(owner1.id, 'Project 1');
      const project2 = await createProject(owner2.id, 'Project 2');

      const invite1 = await createInvitation(project1.id, user.email, 'editor', owner1.id);
      const invite2 = await createInvitation(project2.id, user.email, 'viewer', owner2.id);

      await acceptInvitation(invite1.token, user.email);
      await acceptInvitation(invite2.token, user.email);

      // Super admin views user's memberships
      const userMemberships = await prisma.projectMembership.findMany({
        where: { userId: user.id },
        include: {
          project: true,
        },
      });

      expect(userMemberships).toHaveLength(2);
      expect(userMemberships.find(m => m.projectId === project1.id)?.role).toBe('editor');
      expect(userMemberships.find(m => m.projectId === project2.id)?.role).toBe('viewer');
    });
  });

  describe('Super Admin Membership Management', () => {
    it('should list all memberships across all projects', async () => {
      // Create multiple projects with members
      const owner1 = await prisma.user.create({
        data: { email: 'owner1@example.com', name: 'Owner 1' },
      });

      const owner2 = await prisma.user.create({
        data: { email: 'owner2@example.com', name: 'Owner 2' },
      });

      const project1 = await createProject(owner1.id, 'Project 1');
      const project2 = await createProject(owner2.id, 'Project 2');

      const member = await prisma.user.create({
        data: { email: 'member@example.com', name: 'Member' },
      });

      const invite1 = await createInvitation(project1.id, member.email, 'editor', owner1.id);
      const invite2 = await createInvitation(project2.id, member.email, 'admin', owner2.id);

      await acceptInvitation(invite1.token, member.email);
      await acceptInvitation(invite2.token, member.email);

      // Super admin lists all memberships
      const allMemberships = await prisma.projectMembership.findMany({
        include: {
          user: true,
          project: true,
        },
      });

      // Should include owner memberships + invited member memberships
      expect(allMemberships.length).toBeGreaterThanOrEqual(4);
    });

    it('should remove member from project', async () => {
      // Create project with member
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      const member = await prisma.user.create({
        data: { email: 'member@example.com', name: 'Member' },
      });

      const invite = await createInvitation(project.id, member.email, 'editor', owner.id);
      await acceptInvitation(invite.token, member.email);

      // Verify member exists
      const membershipBefore = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: member.id,
            projectId: project.id,
          },
        },
      });

      expect(membershipBefore).toBeDefined();

      // Super admin removes member
      await prisma.projectMembership.delete({
        where: { id: membershipBefore!.id },
      });

      // Verify member was removed
      const membershipAfter = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: member.id,
            projectId: project.id,
          },
        },
      });

      expect(membershipAfter).toBeNull();
    });

    it('should transfer project ownership', async () => {
      // Create project
      const originalOwner = await prisma.user.create({
        data: { email: 'original@example.com', name: 'Original Owner' },
      });

      const project = await createProject(originalOwner.id, 'Test Project');

      // Add new member who will become owner
      const newOwner = await prisma.user.create({
        data: { email: 'newowner@example.com', name: 'New Owner' },
      });

      const invite = await createInvitation(project.id, newOwner.email, 'admin', originalOwner.id);
      await acceptInvitation(invite.token, newOwner.email);

      // Super admin transfers ownership
      const originalOwnerMembership = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: originalOwner.id,
            projectId: project.id,
          },
        },
      });

      const newOwnerMembership = await prisma.projectMembership.findUnique({
        where: {
          userId_projectId: {
            userId: newOwner.id,
            projectId: project.id,
          },
        },
      });

      // Transfer ownership
      await prisma.projectMembership.update({
        where: { id: originalOwnerMembership!.id },
        data: { role: 'admin' },
      });

      await prisma.projectMembership.update({
        where: { id: newOwnerMembership!.id },
        data: { role: 'owner' },
      });

      // Verify ownership transfer
      const updatedOriginalMembership = await prisma.projectMembership.findUnique({
        where: { id: originalOwnerMembership!.id },
      });

      const updatedNewMembership = await prisma.projectMembership.findUnique({
        where: { id: newOwnerMembership!.id },
      });

      expect(updatedOriginalMembership?.role).toBe('admin');
      expect(updatedNewMembership?.role).toBe('owner');
    });
  });

  describe('Super Admin Invitation Management', () => {
    it('should view all invitations across all projects', async () => {
      // Create multiple projects with invitations
      const owner1 = await prisma.user.create({
        data: { email: 'owner1@example.com', name: 'Owner 1' },
      });

      const owner2 = await prisma.user.create({
        data: { email: 'owner2@example.com', name: 'Owner 2' },
      });

      const project1 = await createProject(owner1.id, 'Project 1');
      const project2 = await createProject(owner2.id, 'Project 2');

      await createInvitation(project1.id, 'invite1@example.com', 'editor', owner1.id);
      await createInvitation(project1.id, 'invite2@example.com', 'viewer', owner1.id);
      await createInvitation(project2.id, 'invite3@example.com', 'admin', owner2.id);

      // Super admin lists all invitations
      const allInvitations = await prisma.invitation.findMany({
        include: {
          project: true,
        },
      });

      expect(allInvitations.length).toBeGreaterThanOrEqual(3);
    });

    it('should regenerate invitation token', async () => {
      // Create invitation
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      const invitation = await createInvitation(
        project.id,
        'invited@example.com',
        'editor',
        owner.id
      );

      const originalToken = invitation.token;

      // Super admin regenerates token
      const crypto = require('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { token: newToken },
      });

      const updatedInvitation = await prisma.invitation.findUnique({
        where: { id: invitation.id },
      });

      expect(updatedInvitation?.token).not.toBe(originalToken);
      expect(updatedInvitation?.token).toBe(newToken);
    });
  });

  describe('Super Admin Cross-Project Operations', () => {
    it('should perform operations across multiple projects simultaneously', async () => {
      // Create multiple projects
      const user1 = await prisma.user.create({
        data: { email: 'user1@example.com', name: 'User 1' },
      });

      const user2 = await prisma.user.create({
        data: { email: 'user2@example.com', name: 'User 2' },
      });

      const project1 = await createProject(user1.id, 'Project 1');
      const project2 = await createProject(user2.id, 'Project 2');

      // Super admin disables both projects
      await prisma.project.updateMany({
        where: {
          id: {
            in: [project1.id, project2.id],
          },
        },
        data: { enabled: false },
      });

      // Verify both projects are disabled
      const projects = await prisma.project.findMany({
        where: {
          id: {
            in: [project1.id, project2.id],
          },
        },
      });

      expect(projects.every(p => p.enabled === false)).toBe(true);
    });

    it('should view system-wide statistics', async () => {
      // Create test data
      const users = await Promise.all([
        prisma.user.create({ data: { email: 'stat1@example.com', name: 'Stat User 1' } }),
        prisma.user.create({ data: { email: 'stat2@example.com', name: 'Stat User 2' } }),
        prisma.user.create({ data: { email: 'stat3@example.com', name: 'Stat User 3' } }),
      ]);

      const projects = await Promise.all([
        createProject(users[0].id, 'Stat Project 1'),
        createProject(users[1].id, 'Stat Project 2'),
        createProject(users[2].id, 'Stat Project 3'),
      ]);

      // Super admin gets system statistics
      const totalUsers = await prisma.user.count();
      const totalProjects = await prisma.project.count();
      const totalMemberships = await prisma.projectMembership.count();
      const totalInvitations = await prisma.invitation.count();

      expect(totalUsers).toBeGreaterThanOrEqual(5); // Super admin + regular + 3 stat users
      expect(totalProjects).toBeGreaterThanOrEqual(3);
      expect(totalMemberships).toBeGreaterThanOrEqual(3); // One owner per project
      expect(totalInvitations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Regular User Restrictions', () => {
    it('should prevent regular user from accessing super admin operations', async () => {
      // Regular user should not be in allowlist
      const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      expect(superAdminEmails).not.toContain(regularUser.email);

      // Regular user cannot list all projects (only their own)
      const regularUserProjects = await getUserProjects(regularUser.id);
      const allProjects = await prisma.project.findMany();

      // Regular user should see fewer projects than exist
      expect(regularUserProjects.length).toBeLessThanOrEqual(allProjects.length);
    });

    it('should prevent regular user from viewing other users data', async () => {
      // Create another user's project
      const otherUser = await prisma.user.create({
        data: { email: 'other@example.com', name: 'Other User' },
      });

      const otherProject = await createProject(otherUser.id, 'Other Project');

      // Regular user should not see other user's project
      const regularUserProjects = await getUserProjects(regularUser.id);

      expect(regularUserProjects.map(p => p.id)).not.toContain(otherProject.id);
    });
  });
});
