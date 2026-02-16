/**
 * Project Invitations API Routes
 * 
 * GET /api/projects/[id]/invitations - List invitations
 * POST /api/projects/[id]/invitations - Create invitation
 * 
 * Requirements: 5.1, 5.4, 5.10
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import { 
  createInvitation, 
  sendInvitationEmail 
} from '@/lib/invitation';
import { 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ValidationError,
  validateEmail,
  validateRequiredFields
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * GET /api/projects/[id]/invitations
 * List all invitations for a project
 * Only owners and admins can view invitations
 * 
 * Requirements: 5.10
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get project ID from params
  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check user's role in the project
  const role = await getUserRole(session.userId, projectId);
  if (!role) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners and admins can view invitations
  if (role !== 'owner' && role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can view invitations');
  }

  // Get all invitations for the project
  const invitations = await prisma.invitation.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(invitations);
});

/**
 * POST /api/projects/[id]/invitations
 * Create a new invitation for a user to join the project
 * Only owners and admins can create invitations
 * 
 * Requirements: 5.1, 5.4
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get project ID from params
  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check user's role in the project
  const role = await getUserRole(session.userId, projectId);
  if (!role) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners and admins can invite members
  if (role !== 'owner' && role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can invite members');
  }

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['invitedEmail', 'role']);

  const { invitedEmail, role: invitedRole } = body;

  // Validate email format
  validateEmail(invitedEmail, 'invitedEmail');

  // Validate role is a valid Role enum value
  const validRoles: Role[] = ['owner', 'admin', 'editor', 'viewer'];
  if (!validRoles.includes(invitedRole)) {
    throw new ValidationError('Invalid role', {
      role: 'Role must be one of: owner, admin, editor, viewer',
    });
  }

  // Check if user is already a member
  const existingMembership = await prisma.projectMembership.findFirst({
    where: {
      projectId,
      user: {
        email: invitedEmail,
      },
    },
  });

  if (existingMembership) {
    throw new ValidationError('User is already a member of this project');
  }

  // Check if there's already a pending invitation for this email
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      projectId,
      invitedEmail,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvitation) {
    throw new ValidationError('An invitation has already been sent to this email address');
  }

  // Get inviter information
  const inviter = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!inviter) {
    throw new AuthenticationError('User not found');
  }

  // Create the invitation
  const invitation = await createInvitation(
    projectId,
    invitedEmail,
    invitedRole,
    session.userId
  );

  // Send invitation email
  await sendInvitationEmail(invitation, project, inviter);

  return successResponse(
    {
      id: invitation.id,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    },
    201
  );
});
