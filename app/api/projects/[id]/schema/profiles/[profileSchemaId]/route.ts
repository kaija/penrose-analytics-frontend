/**
 * Profile Schema Detail API Routes
 *
 * PUT    /api/projects/[id]/schema/profiles/[profileSchemaId] - Update a profile schema
 * DELETE /api/projects/[id]/schema/profiles/[profileSchemaId] - Delete a profile schema
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
import type { SchemaDataType } from '@/lib/types/schema';

const VALID_DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];

/**
 * PUT /api/projects/[id]/schema/profiles/[profileSchemaId]
 * Update a profile schema (partial update)
 * Requires schema:update permission (admin+)
 *
 * Requirements: 4.6
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
  const profileSchemaId = params?.profileSchemaId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'schema:update');

  // Verify profile schema exists and belongs to this project
  const existing = await prisma.profileSchema.findFirst({
    where: { id: profileSchemaId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('ProfileSchema');
  }

  const body = await request.json();

  // Build update data from provided fields
  const updateData: Record<string, unknown> = {};

  if (body.field !== undefined) {
    if (typeof body.field !== 'string' || body.field.trim().length === 0) {
      throw new ValidationError('field is required and cannot be empty');
    }
    updateData.field = body.field.trim();
  }

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || body.displayName.trim().length === 0) {
      throw new ValidationError('displayName is required and cannot be empty');
    }
    updateData.displayName = body.displayName.trim();
  }

  if (body.dataType !== undefined) {
    if (!VALID_DATA_TYPES.includes(body.dataType)) {
      throw new ValidationError(
        `dataType must be one of: ${VALID_DATA_TYPES.join(', ')}`
      );
    }
    updateData.dataType = body.dataType;
  }

  if (body.icon !== undefined) {
    updateData.icon = body.icon;
  }

  if (body.category !== undefined) {
    updateData.category = body.category;
  }

  if (body.suggestedValues !== undefined) {
    updateData.suggestedValues = body.suggestedValues;
  }

  try {
    const updated = await prisma.profileSchema.update({
      where: { id: profileSchemaId },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) for field within project
    if (
      error instanceof Error &&
      error.constructor.name === 'PrismaClientKnownRequestError' &&
      (error as any).code === 'P2002'
    ) {
      throw new ConflictError(
        `A profile schema with the field '${body.field}' already exists in this project`
      );
    }
    throw error;
  }
});

/**
 * DELETE /api/projects/[id]/schema/profiles/[profileSchemaId]
 * Delete a profile schema
 * Requires schema:delete permission (admin+)
 *
 * Requirements: 4.7
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
  const profileSchemaId = params?.profileSchemaId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'schema:delete');

  // Verify profile schema exists and belongs to this project
  const existing = await prisma.profileSchema.findFirst({
    where: { id: profileSchemaId, projectId },
  });

  if (!existing) {
    throw new NotFoundError('ProfileSchema');
  }

  await prisma.profileSchema.delete({
    where: { id: profileSchemaId },
  });

  return successResponse({ message: 'Profile schema deleted successfully' });
});
