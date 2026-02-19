/**
 * Segment API Routes
 *
 * GET  /api/projects/[id]/segments - List all segments for a project
 * POST /api/projects/[id]/segments - Create a new segment
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
  validateRequiredFields,
  validateStringLength,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getIpAddress, getUserAgent } from '@/lib/audit-log';

/**
 * GET /api/projects/[id]/segments
 * List all segments for a project, ordered by updatedAt descending
 * Requires segment:read permission (viewer+)
 *
 * Requirements: 2.2, 2.8, 2.9
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
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'segment:read');

  const segments = await prisma.segment.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  });

  return successResponse({ segments });
});

/**
 * POST /api/projects/[id]/segments
 * Create a new segment
 * Requires segment:create permission (editor+)
 *
 * Requirements: 2.1, 2.6, 2.8, 2.9, 2.10, 2.11
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  await enforcePermission(session.userId, projectId, 'segment:create');

  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['name', 'filterConfig']);

  // Validate name length (1-200 characters)
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new ValidationError('Segment name is required and cannot be empty');
  }

  validateStringLength(body, { name: { min: 1, max: 200 } });

  // Validate filterConfig is a valid object
  if (typeof body.filterConfig !== 'object' || body.filterConfig === null || Array.isArray(body.filterConfig)) {
    throw new ValidationError('filterConfig must be a valid JSON object');
  }

  try {
    const segment = await prisma.segment.create({
      data: {
        projectId,
        name: body.name.trim(),
        description: body.description ?? null,
        filterConfig: body.filterConfig,
        createdBy: session.userId,
      },
    });

    // Log segment creation
    await createAuditLog(
      session.userId,
      'segment.create',
      {
        resourceId: segment.id,
        resourceName: segment.name,
        resourceType: 'segment',
        metadata: {
          description: segment.description,
        },
        ipAddress: getIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      projectId
    );

    return successResponse(segment, 201);
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
