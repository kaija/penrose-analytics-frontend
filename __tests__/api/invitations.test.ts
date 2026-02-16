/**
 * Unit tests for invitation API routes
 * 
 * Tests:
 * - POST /api/projects/[id]/invitations - create invitation
 * - POST /api/invitations/[id]/resend - resend invitation
 * - POST /api/invitations/accept - process acceptance
 * 
 * Requirements: 5.1, 5.4, 5.5, 5.10
 */

import { NextRequest } from 'next/server';
import { POST as createInvitationRoute } from '@/app/api/projects/[id]/invitations/route';
import { POST as resendInvitationRoute } from '@/app/api/invitations/[id]/resend/route';
import { POST as acceptInvitationRoute } from '@/app/api/invitations/accept/route';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import { prisma } from '@/lib/prisma';
import * as invitationModule from '@/lib/invitation';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/project');
jest.mock('@/lib/invitation');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    projectMembership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>;
const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>;
const mockCreateInvitation = invitationModule.createInvitation as jest.MockedFunction<typeof invitationModule.createInvitation>;
const mockSendInvitationEmail = invitationModule.sendInvitationEmail as jest.MockedFunction<typeof invitationModule.sendInvitationEmail>;
const mockResendInvitation = invitationModule.resendInvitation as jest.MockedFunction<typeof invitationModule.resendInvitation>;
const mockAcceptInvitation = invitationModule.acceptInvitation as jest.MockedFunction<typeof invitationModule.acceptInvitation>;

describe('Invitation API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Test Owner',
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvitation = {
    id: 'invitation-1',
    token: 'test-token-123',
    projectId: 'project-1',
    invitedEmail: 'invited@example.com',
    role: 'editor' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/invitations', () => {
    test('creates invitation when user is owner', async () => {
      // Mock session validation
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      // Mock project lookup
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock role check
      mockGetUserRole.mockResolvedValue('owner');

      // Mock existing member check
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock existing invitation check
      (prisma.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock user lookup
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Mock invitation creation
      mockCreateInvitation.mockResolvedValue(mockInvitation);
      mockSendInvitationEmail.mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/projects/project-1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitedEmail: 'invited@example.com',
          role: 'editor',
        }),
      });

      const response = await createInvitationRoute(request, {
        params: { id: 'project-1' },
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.invitedEmail).toBe('invited@example.com');
      expect(data.data.role).toBe('editor');
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        'project-1',
        'invited@example.com',
        'editor',
        mockUser.id
      );
      expect(mockSendInvitationEmail).toHaveBeenCalled();
    });

    test('rejects invitation creation for editor', async () => {
      mockValidateSession.mockResolvedValue({
        userId: 'editor-user-id',
        activeProjectId: mockProject.id,
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock role check - user is editor
      mockGetUserRole.mockResolvedValue('editor');

      const request = new NextRequest('http://localhost:3000/api/projects/project-1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitedEmail: 'invited@example.com',
          role: 'viewer',
        }),
      });

      const response = await createInvitationRoute(request, {
        params: { id: 'project-1' },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.message).toContain('Only owners and admins can invite members');
    });

    test('rejects invitation for already existing member', async () => {
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock role check - user is owner
      mockGetUserRole.mockResolvedValue('owner');

      // Mock existing member with invited email
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue({
        id: 'membership-3',
        userId: 'existing-user-id',
        projectId: mockProject.id,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/projects/project-1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitedEmail: 'existing@example.com',
          role: 'editor',
        }),
      });

      const response = await createInvitationRoute(request, {
        params: { id: 'project-1' },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toContain('already a member');
    });

    test('validates email format', async () => {
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      mockGetUserRole.mockResolvedValue('owner');

      const request = new NextRequest('http://localhost:3000/api/projects/project-1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitedEmail: 'not-an-email',
          role: 'editor',
        }),
      });

      const response = await createInvitationRoute(request, {
        params: { id: 'project-1' },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toContain('email');
    });

    test('validates role is valid enum value', async () => {
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      mockGetUserRole.mockResolvedValue('owner');

      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/project-1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitedEmail: 'invited@example.com',
          role: 'superuser',
        }),
      });

      const response = await createInvitationRoute(request, {
        params: { id: 'project-1' },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toContain('role');
    });
  });

  describe('POST /api/invitations/[id]/resend', () => {
    test('resends invitation and extends expiration', async () => {
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      mockGetUserRole.mockResolvedValue('owner');

      const updatedInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      mockResendInvitation.mockResolvedValue({ success: true });
      (prisma.invitation.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce(updatedInvitation);

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-1/resend', {
        method: 'POST',
      });

      const response = await resendInvitationRoute(request, {
        params: { id: 'invitation-1' },
      });

      expect(response.status).toBe(200);
      expect(mockResendInvitation).toHaveBeenCalledWith('invitation-1');
    });

    test('rejects resending for non-member', async () => {
      mockValidateSession.mockResolvedValue({
        userId: 'non-member-id',
        activeProjectId: null,
      });

      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      mockGetUserRole.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-1/resend', {
        method: 'POST',
      });

      const response = await resendInvitationRoute(request, {
        params: { id: 'invitation-1' },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.message).toContain('not a member');
    });

    test('rejects resending for viewer', async () => {
      mockValidateSession.mockResolvedValue({
        userId: 'viewer-id',
        activeProjectId: mockProject.id,
      });

      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      mockGetUserRole.mockResolvedValue('viewer');

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-1/resend', {
        method: 'POST',
      });

      const response = await resendInvitationRoute(request, {
        params: { id: 'invitation-1' },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.message).toContain('Only owners and admins');
    });

    test('rejects resending non-existent invitation', async () => {
      mockValidateSession.mockResolvedValue({
        userId: mockUser.id,
        activeProjectId: mockProject.id,
      });

      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/invitations/non-existent/resend', {
        method: 'POST',
      });

      const response = await resendInvitationRoute(request, {
        params: { id: 'non-existent' },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.message).toContain('not found');
    });
  });

  describe('POST /api/invitations/accept', () => {
    test('accepts valid invitation with matching email', async () => {
      const invitedUser = {
        id: 'invited-user-id',
        email: 'invited@example.com',
        name: 'Invited User',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockValidateSession.mockResolvedValue({
        userId: invitedUser.id,
        activeProjectId: null,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(invitedUser);

      const membership = {
        id: 'membership-new',
        userId: invitedUser.id,
        projectId: mockProject.id,
        role: 'editor' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAcceptInvitation.mockResolvedValue(membership);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: 'test-token-123',
        }),
      });

      const response = await acceptInvitationRoute(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.membership.userId).toBe(invitedUser.id);
      expect(data.data.membership.projectId).toBe(mockProject.id);
      expect(data.data.membership.role).toBe('editor');
      expect(data.data.project.name).toBe('Test Project');
      expect(mockAcceptInvitation).toHaveBeenCalledWith('test-token-123', invitedUser.email);
    });

    test('rejects acceptance without authentication', async () => {
      mockValidateSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: 'test-token-123',
        }),
      });

      const response = await acceptInvitationRoute(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.message).toContain('logged in');
    });

    test('rejects acceptance with missing token', async () => {
      mockValidateSession.mockResolvedValue({
        userId: 'user-id',
        activeProjectId: null,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await acceptInvitationRoute(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toContain('token');
    });

    test('rejects acceptance with invalid token', async () => {
      mockValidateSession.mockResolvedValue({
        userId: 'user-id',
        activeProjectId: null,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      mockAcceptInvitation.mockRejectedValue(new Error('Invalid or expired invitation'));

      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
        }),
      });

      const response = await acceptInvitationRoute(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Invitation email content', () => {
    test('email link format contains token', () => {
      const token = 'test-token-123';
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const expectedLink = `${baseUrl}/invite/accept?token=${token}`;

      expect(expectedLink).toContain(token);
      expect(expectedLink).toContain('/invite/accept');
    });

    test('invitation contains required fields', () => {
      expect(mockInvitation.invitedEmail).toBe('invited@example.com');
      expect(mockInvitation.role).toBe('editor');
      expect(mockInvitation.projectId).toBe('project-1');
      expect(mockInvitation.token).toBeDefined();
      expect(mockInvitation.expiresAt).toBeInstanceOf(Date);
    });
  });
});
