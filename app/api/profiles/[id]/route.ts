/**
 * Profile Detail API Routes
 * 
 * GET /api/profiles/[id] - Get a profile with events
 * 
 * Requirements: 10.4, 10.5, 10.6
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getProfileWithEvents } from '@/lib/profile';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/profiles/[id]
 * Get a profile with its events
 * Requires viewer+ permissions
 * 
 * Requirements: 10.4, 10.5, 10.6
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get profile ID from params
  const profileId = context?.params?.id;
  if (!profileId) {
    throw new NotFoundError('Profile');
  }

  // Get profile to verify it exists and get project ID
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new NotFoundError('Profile');
  }

  // Enforce viewer+ permissions (profile:read)
  await enforcePermission(session.userId, profile.projectId, 'profile:read');

  // Get profile with events
  const profileWithEvents = await getProfileWithEvents(profileId);

  return successResponse(profileWithEvents);
});
