/**
 * Project Member Management API Routes
 *
 * PUT /api/projects/[id]/members/[memberId] - Update member role
 * DELETE /api/projects/[id]/members/[memberId] - Remove member
 *
 * Requirements: 17.3, 17.4
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { updateMemberRole, removeProjectMember } from '@/lib/project';
import {
  AuthenticationError,
  NotFoundError,
  validateRequiredFields
} from '@/lib/errors';
import { Role } from '@prisma/client';

/**
 * PUT /api/projects/[id]/members/[memberId]
 * Update a member's role
 * Only owners can update roles
 *
 * Requirements: 17.3
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get member ID from params
  const params = await context?.params;
  const memberId = params?.memberId;
  if (!memberId) {
    throw new NotFoundError('Membership');
  }

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['role']);

  // Validate role is a valid enum value
  const validRoles: Role[] = ['owner', 'admin', 'editor', 'viewer'];
  if (!validRoles.includes(body.role)) {
    throw new NotFoundError('Invalid role');
  }

  // Update member role
  await updateMemberRole(session.userId, memberId, body.role);

  return successResponse({ message: 'Member role updated successfully' });
});

/**
 * DELETE /api/projects/[id]/members/[memberId]
 * Remove a member from the project
 * Only owners and admins can remove members
 *
 * Requirements: 17.4
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get member ID from params
  const params = await context?.params;
  const memberId = params?.memberId;
  if (!memberId) {
    throw new NotFoundError('Membership');
  }

  // Remove member
  await removeProjectMember(session.userId, memberId);

  return successResponse({ message: 'Member removed successfully' });
});
