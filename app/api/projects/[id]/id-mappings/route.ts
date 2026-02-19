/**
 * ID Mappings API Route
 *
 * GET /api/projects/[id]/id-mappings - Get ID mappings for a project
 * POST /api/projects/[id]/id-mappings - Create ID mapping
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { AuthenticationError, NotFoundError, ValidationError } from '@/lib/errors';
import {
  createIdMapping,
  getIdMappingStats,
  resolveId,
  cleanupExpiredIdMappings,
} from '@/lib/id-mapping';

/**
 * GET /api/projects/[id]/id-mappings
 * Get ID mapping statistics for a project
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

  await enforcePermission(session.userId, projectId, 'project:read');

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  // Handle different actions
  if (action === 'stats') {
    const stats = await getIdMappingStats(projectId);
    return successResponse(stats);
  }

  if (action === 'resolve') {
    const idType = searchParams.get('idType');
    const idValue = searchParams.get('idValue');

    if (!idType || !idValue) {
      throw new ValidationError('idType and idValue are required for resolve action');
    }

    const profileId = await resolveId(projectId, idType, idValue);
    return successResponse({ profileId });
  }

  if (action === 'cleanup') {
    await enforcePermission(session.userId, projectId, 'project:update');
    const deletedCount = await cleanupExpiredIdMappings(projectId);
    return successResponse({ deletedCount });
  }

  // Default: return stats
  const stats = await getIdMappingStats(projectId);
  return successResponse(stats);
});

/**
 * POST /api/projects/[id]/id-mappings
 * Create a new ID mapping
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

  await enforcePermission(session.userId, projectId, 'project:update');

  const body = await request.json();
  const { idType, idValue, profileId, expiresAt } = body;

  if (!idType || !idValue || !profileId) {
    throw new ValidationError('idType, idValue, and profileId are required');
  }

  const mapping = await createIdMapping({
    projectId,
    idType,
    idValue,
    profileId,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  return successResponse(mapping);
});
