/**
 * Integration Test: Invitation → Acceptance → Member Access Flow
 * 
 * Tests the complete flow from invitation creation through acceptance
 * and verification of member access to project resources.
 * 
 * Requirements: 5.1-5.11, 17.1-17.6, 4.1-4.10
 */

import { prisma } from '@/lib/prisma';
import { createInvitation, acceptInvitation, validateInvitationToken } from '@/lib/invitation';
import { createProject, getUserProjects, getProjectMembers } from '@/lib/project';
import { canPerformAction } from '@/lib/rbac';
import { Role } from '@prisma/client';

describe('Integration: Invitation → Acceptance → Member Access Flow', () => {
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

  describe('Complete Invitation Flow', () => {
    it('should complete full flow: Create → Send → Accept → Access', async () => {
      // Step 1: Create owner and project
      const owner = await prisma.user.create({
        data: {
          email: 'owner@example.com',
          name: 'Project Owner',
        },
      });

      const project = await createProject(owner.id, 'Team Project');

      // Step 2: Owner creates invitation
      const invitation = await createInvitation(
        project.id,
        'newmember@example.com',
        'editor',
        owner.id
      );

      // Verify invitation was created correctly
      expect(invitation).toBeDefined();
      expect(invitation.token).toBeDefined();
      expect(invitation.invitedEmail).toBe('newmember@example.com');
      expect(invitation.role).toBe('editor');
      expect(invitation.projectId).toBe(project.id);
      expect(invitation.acceptedAt).toBeNull();
      expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Step 3: Invitee receives email and validates token
      const validatedInvitation = await validateInvitationToken(invitation.token);

      expect(validatedInvitation).toBeDefined();
      expect(validatedInvitation?.id).toBe(invitation.id);
      expect(validatedInvitation?.invitedEmail).toBe('newmember@example.com');

      // Step 4: Invitee authenticates via OAuth
      const newMember = await prisma.user.create({
        data: {
          email: 'newmember@example.com',
          name: 'New Member',
        },
      });

      // Step 5: Accept invitation
      const membership = await acceptInvitation(invitation.token, newMember.email);

      // Verify membership was created
      expect(membership).toBeDefined();
      expect(membership.userId).toBe(newMember.id);
      expect(membership.projectId).toBe(project.id);
      expect(membership.role).toBe('editor');

      // Step 6: Verify invitation was marked as accepted
      const acceptedInvitation = await prisma.invitation.findUnique({
        where: { id: invitation.id },
      });

      expect(acceptedInvitation?.acceptedAt).toBeInstanceOf(Date);
      expect(acceptedInvitation?.acceptedAt).not.toBeNull();

      // Step 7: Verify new member can access project
      const memberProjects = await getUserProjects(newMember.id);

      expect(memberProjects).toHaveLength(1);
      expect(memberProjects[0].id).toBe(project.id);

      // Step 8: Verify new member appears in project members list
      const projectMembers = await getProjectMembers(project.id);

      expect(projectMembers).toHaveLength(2); // Owner + new member
      expect(projectMembers.some((m) => m.userId === owner.id && m.role === 'owner')).toBe(true);
      expect(projectMembers.some((m) => m.userId === newMember.id && m.role === 'editor')).toBe(true);

      // Step 9: Verify new member has correct permissions
      const canCreateDashboard = await canPerformAction(newMember.id, project.id, 'dashboard:create');
      const canInviteMembers = await canPerformAction(newMember.id, project.id, 'members:invite');

      expect(canCreateDashboard).toBe(true); // Editors can create dashboards
      expect(canInviteMembers).toBe(false); // Editors cannot invite members
    });

    it('should handle multiple invitations to same project', async () => {
      // Create owner and project
      const owner = await prisma.user.create({
        data: {
          email: 'owner@example.com',
          name: 'Project Owner',
        },
      });

      const project = await createProject(owner.id, 'Multi-Member Project');

      // Create multiple invitations with different roles
      const editorInvite = await createInvitation(
        project.id,
        'editor@example.com',
        'editor',
        owner.id
      );

      const viewerInvite = await createInvitation(
        project.id,
        'viewer@example.com',
        'viewer',
        owner.id
      );

      const adminInvite = await createInvitation(
        project.id,
        'admin@example.com',
        'admin',
        owner.id
      );

      // Create users and accept invitations
      const editor = await prisma.user.create({
        data: { email: 'editor@example.com', name: 'Editor User' },
      });

      const viewer = await prisma.user.create({
        data: { email: 'viewer@example.com', name: 'Viewer User' },
      });

      const admin = await prisma.user.create({
        data: { email: 'admin@example.com', name: 'Admin User' },
      });

      await acceptInvitation(editorInvite.token, editor.email);
      await acceptInvitation(viewerInvite.token, viewer.email);
      await acceptInvitation(adminInvite.token, admin.email);

      // Verify all members have access
      const projectMembers = await getProjectMembers(project.id);

      expect(projectMembers).toHaveLength(4); // Owner + 3 invited members
      expect(projectMembers.find((m) => m.userId === editor.id)?.role).toBe('editor');
      expect(projectMembers.find((m) => m.userId === viewer.id)?.role).toBe('viewer');
      expect(projectMembers.find((m) => m.userId === admin.id)?.role).toBe('admin');
    });
  });

  describe('Role-Based Access After Invitation', () => {
    it('should grant correct permissions for editor role', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      const invitation = await createInvitation(
        project.id,
        'editor@example.com',
        'editor',
        owner.id
      );

      const editor = await prisma.user.create({
        data: { email: 'editor@example.com', name: 'Editor' },
      });

      await acceptInvitation(invitation.token, editor.email);

      // Test editor permissions
      expect(await canPerformAction(editor.id, project.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'dashboard:read')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'dashboard:update')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'dashboard:delete')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'report:create')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(editor.id, project.id, 'event:read')).toBe(true);

      // Editors cannot manage members
      expect(await canPerformAction(editor.id, project.id, 'members:invite')).toBe(false);
      expect(await canPerformAction(editor.id, project.id, 'members:update')).toBe(false);
      expect(await canPerformAction(editor.id, project.id, 'members:remove')).toBe(false);
    });

    it('should grant correct permissions for viewer role', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      const invitation = await createInvitation(
        project.id,
        'viewer@example.com',
        'viewer',
        owner.id
      );

      const viewer = await prisma.user.create({
        data: { email: 'viewer@example.com', name: 'Viewer' },
      });

      await acceptInvitation(invitation.token, viewer.email);

      // Test viewer permissions (read-only)
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:read')).toBe(true);
      expect(await canPerformAction(viewer.id, project.id, 'report:read')).toBe(true);
      expect(await canPerformAction(viewer.id, project.id, 'profile:read')).toBe(true);
      expect(await canPerformAction(viewer.id, project.id, 'event:read')).toBe(true);

      // Viewers cannot create or modify
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:create')).toBe(false);
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:update')).toBe(false);
      expect(await canPerformAction(viewer.id, project.id, 'dashboard:delete')).toBe(false);
      expect(await canPerformAction(viewer.id, project.id, 'report:create')).toBe(false);
      expect(await canPerformAction(viewer.id, project.id, 'members:invite')).toBe(false);
    });

    it('should grant correct permissions for admin role', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      const invitation = await createInvitation(
        project.id,
        'admin@example.com',
        'admin',
        owner.id
      );

      const admin = await prisma.user.create({
        data: { email: 'admin@example.com', name: 'Admin' },
      });

      await acceptInvitation(invitation.token, admin.email);

      // Test admin permissions
      expect(await canPerformAction(admin.id, project.id, 'members:invite')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'members:update')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'members:remove')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'dashboard:create')).toBe(true);
      expect(await canPerformAction(admin.id, project.id, 'report:create')).toBe(true);

      // Admins cannot delete projects
      expect(await canPerformAction(admin.id, project.id, 'project:delete')).toBe(false);
    });
  });

  describe('Invitation Error Cases', () => {
    it('should reject invitation with mismatched email', async () => {
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

      // Create user with different email
      const wrongUser = await prisma.user.create({
        data: { email: 'wrong@example.com', name: 'Wrong User' },
      });

      // Attempt to accept with wrong email
      await expect(
        acceptInvitation(invitation.token, wrongUser.email)
      ).rejects.toThrow('This invitation was sent to a different email address');

      // Verify no membership was created
      const memberships = await prisma.projectMembership.findMany({
        where: { projectId: project.id, userId: wrongUser.id },
      });

      expect(memberships).toHaveLength(0);
    });

    it('should reject expired invitation', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      // Create expired invitation
      const invitation = await prisma.invitation.create({
        data: {
          token: 'expired-token',
          projectId: project.id,
          invitedEmail: 'invited@example.com',
          role: 'editor',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      const user = await prisma.user.create({
        data: { email: 'invited@example.com', name: 'Invited User' },
      });

      // Attempt to accept expired invitation
      await expect(
        acceptInvitation(invitation.token, user.email)
      ).rejects.toThrow('Invalid or expired invitation');
    });

    it('should reject already accepted invitation', async () => {
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

      const user = await prisma.user.create({
        data: { email: 'invited@example.com', name: 'Invited User' },
      });

      // Accept invitation first time
      await acceptInvitation(invitation.token, user.email);

      // Attempt to accept again
      await expect(
        acceptInvitation(invitation.token, user.email)
      ).rejects.toThrow('Invalid or expired invitation');
    });
  });

  describe('Admin Invitation Capabilities', () => {
    it('should allow admin to invite new members', async () => {
      // Create owner and project
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', name: 'Owner' },
      });

      const project = await createProject(owner.id, 'Test Project');

      // Invite admin
      const adminInvite = await createInvitation(
        project.id,
        'admin@example.com',
        'admin',
        owner.id
      );

      const admin = await prisma.user.create({
        data: { email: 'admin@example.com', name: 'Admin' },
      });

      await acceptInvitation(adminInvite.token, admin.email);

      // Admin creates invitation for new member
      const newMemberInvite = await createInvitation(
        project.id,
        'newmember@example.com',
        'viewer',
        admin.id
      );

      expect(newMemberInvite).toBeDefined();
      expect(newMemberInvite.invitedEmail).toBe('newmember@example.com');
      expect(newMemberInvite.role).toBe('viewer');

      // New member accepts
      const newMember = await prisma.user.create({
        data: { email: 'newmember@example.com', name: 'New Member' },
      });

      await acceptInvitation(newMemberInvite.token, newMember.email);

      // Verify all three members exist
      const members = await getProjectMembers(project.id);
      expect(members).toHaveLength(3);
    });
  });
});
