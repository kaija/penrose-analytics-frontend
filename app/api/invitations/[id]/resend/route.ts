/**
 * Invitation Resend API Route
 * 
 * POST /api/invitations/[id]/resend - Resend invitation
 * 
 * Requirements: 5.10
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import { resendInvitation } from '@/lib/invitation';
import { 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/invitations/[id]/resend
 * Resend an invitation by extending its expiration and sending a new email
 * Only owners and admins can resend invitations
 * 
 * Requirements: 5.10
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get invitation ID from params
  const invitationId = context?.params?.id;
  if (!invitationId) {
    throw new NotFoundError('Invitation');
  }

  // Look up the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  // Check user's role in the project
  const role = await getUserRole(session.userId, invitation.projectId);
  if (!role) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners and admins can resend invitations
  if (role !== 'owner' && role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can resend invitations');
  }

  // Resend the invitation
  await resendInvitation(invitationId);

  // Get updated invitation
  const updatedInvitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  return successResponse({
    id: updatedInvitation!.id,
    invitedEmail: updatedInvitation!.invitedEmail,
    role: updatedInvitation!.role,
    expiresAt: updatedInvitation!.expiresAt,
    createdAt: updatedInvitation!.createdAt,
  });
});
