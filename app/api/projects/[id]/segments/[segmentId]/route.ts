/**
 * Segment Detail API Routes
 *
 * GET    /api/projects/[id]/segments/[segmentId] - Get a single segment
 * PUT    /api/projects/[id]/segments/[segmentId] - Update a segment
 * DELETE /api/projects/[id]/segments/[segmentId] - Delete a segment
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  validateStringLength,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/[id]/segments/[segmentId]
 * Get a single segment by ID, scoped to the project
 * Requires segment:read permission (viewer+)
 *
 * Requirements: 2.3, 2.7, 2.8, 2.9
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  const params = await context?.params;
  const projectId = params?.id;
  const segmentId = params?.segmentId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'segment:read');

  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, projectId },
  });

  if (!segment) {
    throw new NotFoundError('Segment');
  }

  return successResponse(segment);
});

/**
 * PUT /api/projects/[id]/segments/[segmentId]
 * Update a segment (partial update)
 * Requires segment:update permission (editor+)
 *
 * Requirements: 2.4, 2.7, 2.8, 2.9
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  const params = await context?.params;
  const projectId = params?.id;
  const segmentId = params?.segmentId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'segment:update');

  // Verify segment exists and belongs to this project
  const existing = await prisma.segment.findFirst({
    where: { id: segmentId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('Segment');
  }

  const body = await request.json();

  // Build update data from provided fields
  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new ValidationError('Segment name is required and cannot be empty');
    }
    validateStringLength(body, { name: { min: 1, max: 200 } });
    updateData.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updateData.description = body.description;
  }

  if (body.filterConfig !== undefined) {
    if (typeof body.filterConfig !== 'object' || body.filterConfig === null || Array.isArray(body.filterConfig)) {
      throw new ValidationError('filterConfig must be a valid JSON object');
    }
    updateData.filterConfig = body.filterConfig;
  }

  try {
    const updated = await prisma.segment.update({
      where: { id: segmentId },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) for name within project
    if (
      error instanceof Error &&
      error.constructor.name === 'PrismaClientKnownRequestError' &&
      (error as any).code === 'P2002'
    ) {
      throw new ConflictError(
        `A segment with the name '${body.name}' already exists in this project`
      );
    }
    throw error;
  }
});

/**
 * DELETE /api/projects/[id]/segments/[segmentId]
 * Delete a segment
 * Requires segment:delete permission (editor+)
 *
 * Requirements: 2.5, 2.7, 2.8, 2.9
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  const params = await context?.params;
  const projectId = params?.id;
  const segmentId = params?.segmentId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'segment:delete');

  // Verify segment exists and belongs to this project
  const existing = await prisma.segment.findFirst({
    where: { id: segmentId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('Segment');
  }

  await prisma.segment.delete({
    where: { id: segmentId },
  });

  return successResponse({ message: 'Segment deleted successfully' });
});
