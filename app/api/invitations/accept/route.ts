/**
 * Invitation Acceptance API Route
 *
 * POST /api/invitations/accept - Process invitation acceptance
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { acceptInvitation } from '@/lib/invitation';
import {
  AuthenticationError,
  ValidationError,
  validateRequiredFields
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/invitations/accept
 * Process invitation acceptance
 * Requires authentication and validates email matches invitation
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8
 */
export const POST = withErrorHandler(async (
  request: NextRequest
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError('You must be logged in to accept an invitation');
  }

  // Get authenticated user
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['token']);

  const { token } = body;

  // Validate token is a string
  if (typeof token !== 'string' || token.trim() === '') {
    throw new ValidationError('Invalid token');
  }

  // Accept the invitation
  const membership = await acceptInvitation(token, user.email);

  // Get project details
  const project = await prisma.project.findUnique({
    where: { id: membership.projectId },
  });

  return successResponse({
    membership: {
      id: membership.id,
      userId: membership.userId,
      projectId: membership.projectId,
      role: membership.role,
    },
    project: {
      id: project!.id,
      name: project!.name,
    },
  });
});
