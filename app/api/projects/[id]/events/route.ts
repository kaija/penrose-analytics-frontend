/**
 * Project Events API Routes
 * 
 * POST /api/projects/[id]/events - Track an event
 * GET /api/projects/[id]/events - List events with filters
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { trackEvent, getProjectEvents } from '@/lib/event';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateRequiredFields,
  validateStringLength,
  ValidationError,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/[id]/events
 * Track a new event
 * Requires viewer+ permissions
 * 
 * Requirements: 11.1
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

  // Get project ID from params
  const projectId = context?.params?.id;
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

  // Enforce viewer+ permissions (event:read)
  await enforcePermission(session.userId, projectId, 'event:read');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['profileId', 'eventName', 'payload']);

  // Validate string length
  validateStringLength(body, {
    profileId: { min: 1, max: 255 },
    eventName: { min: 1, max: 255 },
  });

  // Validate payload is an object
  if (typeof body.payload !== 'object' || Array.isArray(body.payload) || body.payload === null) {
    throw new ValidationError('payload must be an object');
  }

  // Parse optional timestamp
  let timestamp: Date | undefined;
  if (body.timestamp) {
    timestamp = new Date(body.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new ValidationError('timestamp must be a valid ISO 8601 date string');
    }
  }

  // Track event
  const event = await trackEvent(
    projectId,
    body.profileId,
    body.eventName,
    body.payload,
    timestamp
  );

  return successResponse(event, 201);
});

/**
 * GET /api/projects/[id]/events
 * List events with filters
 * Requires viewer+ permissions
 * 
 * Requirements: 11.2, 11.3, 11.5
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

  // Get project ID from params
  const projectId = context?.params?.id;
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

  // Enforce viewer+ permissions (event:read)
  await enforcePermission(session.userId, projectId, 'event:read');

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const eventName = searchParams.get('eventName') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Validate pagination parameters
  if (page < 1) {
    throw new ValidationError('page must be greater than 0');
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new ValidationError('pageSize must be between 1 and 100');
  }

  // Parse date filters
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;

  if (startDate) {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw new ValidationError('startDate must be a valid ISO 8601 date string');
    }
  }

  if (endDate) {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      throw new ValidationError('endDate must be a valid ISO 8601 date string');
    }
  }

  // Get events
  const result = await getProjectEvents(
    projectId,
    {
      eventName,
      userId,
      startDate: startDateObj,
      endDate: endDateObj,
    },
    { page, pageSize }
  );

  return successResponse(result);
});
