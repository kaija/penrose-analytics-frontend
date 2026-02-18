/**
 * Event Schema Detail API Routes
 *
 * PUT    /api/projects/[id]/schema/events/[eventSchemaId] - Update an event schema
 * DELETE /api/projects/[id]/schema/events/[eventSchemaId] - Delete an event schema
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
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/projects/[id]/schema/events/[eventSchemaId]
 * Update an event schema (partial update)
 * Requires schema:update permission (admin+)
 *
 * Requirements: 3.6
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
  const eventSchemaId = params?.eventSchemaId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'schema:update');

  // Verify event schema exists and belongs to this project
  const existing = await prisma.eventSchema.findFirst({
    where: { id: eventSchemaId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('EventSchema');
  }

  const body = await request.json();

  // Build update data from provided fields
  const updateData: Record<string, unknown> = {};

  if (body.eventName !== undefined) {
    if (typeof body.eventName !== 'string' || body.eventName.trim().length === 0) {
      throw new ValidationError('eventName is required and cannot be empty');
    }
    updateData.eventName = body.eventName.trim();
  }

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || body.displayName.trim().length === 0) {
      throw new ValidationError('displayName is required and cannot be empty');
    }
    updateData.displayName = body.displayName.trim();
  }

  if (body.icon !== undefined) {
    updateData.icon = body.icon;
  }

  if (body.properties !== undefined) {
    if (!Array.isArray(body.properties)) {
      throw new ValidationError('properties must be an array');
    }
    updateData.properties = body.properties;
  }

  try {
    const updated = await prisma.eventSchema.update({
      where: { id: eventSchemaId },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) for eventName within project
    if (
      error instanceof Error &&
      error.constructor.name === 'PrismaClientKnownRequestError' &&
      (error as any).code === 'P2002'
    ) {
      throw new ConflictError(
        `An event schema with the name '${body.eventName}' already exists in this project`
      );
    }
    throw error;
  }
});

/**
 * DELETE /api/projects/[id]/schema/events/[eventSchemaId]
 * Delete an event schema
 * Requires schema:delete permission (admin+)
 *
 * Requirements: 3.7
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
  const eventSchemaId = params?.eventSchemaId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'schema:delete');

  // Verify event schema exists and belongs to this project
  const existing = await prisma.eventSchema.findFirst({
    where: { id: eventSchemaId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('EventSchema');
  }

  await prisma.eventSchema.delete({
    where: { id: eventSchemaId },
  });

  return successResponse({ message: 'Event schema deleted successfully' });
});
