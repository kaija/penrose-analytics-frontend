/**
 * Event Detail API Routes
 *
 * GET /api/events/[id] - Get event details
 *
 * Requirements: 11.4
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getEventById } from '@/lib/event';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
} from '@/lib/errors';

/**
 * GET /api/events/[id]
 * Get event details
 * Requires viewer+ permissions
 *
 * Requirements: 11.4
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

  // Get event ID from params
  const params = await context?.params;
  const eventId = params?.id;
  if (!eventId) {
    throw new NotFoundError('Event');
  }

  // Get event
  const event = await getEventById(eventId);

  if (!event) {
    throw new NotFoundError('Event');
  }

  // Enforce viewer+ permissions (event:read)
  await enforcePermission(session.userId, event.projectId, 'event:read');

  return successResponse(event);
});
