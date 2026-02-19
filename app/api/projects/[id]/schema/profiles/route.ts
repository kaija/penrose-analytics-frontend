/**
 * Profile Schema API Routes
 *
 * GET  /api/projects/[id]/schema/profiles - Get profile schemas (DB-first, inference fallback)
 * POST /api/projects/[id]/schema/profiles - Create a new profile schema
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import type { ProfileSchemaResponse } from '@/lib/types/schema';
import { DEFAULT_PROFILE_PROPERTIES } from '@/lib/constants/default-profile-properties';

/**
 * GET /api/projects/[id]/schema/profiles
 * Get profile properties — returns default properties with optional inference from real data
 * Requires schema:read permission (viewer+)
 *
 * Requirements: 4.3, 4.4
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) throw new AuthenticationError();

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) throw new NotFoundError('Project');

  await enforcePermission(session.userId, projectId, 'schema:read');

  // Return default profile properties
  // These are the standard properties available for all profiles
  const properties = DEFAULT_PROFILE_PROPERTIES.map(prop => ({
    field: prop.field,
    displayName: prop.displayName,
    dataType: prop.dataType,
    icon: prop.icon,
    category: prop.category,
  }));

  return successResponse({ properties } satisfies ProfileSchemaResponse);
});

/**
 * POST /api/projects/[id]/schema/profiles
 * Profile properties are now predefined and cannot be created via API
 * Use UserSchema API for computed fields instead
 * 
 * Requirements: 4.5
 */
export const POST = withErrorHandler(async (
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) throw new AuthenticationError();

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) throw new NotFoundError('Project');

  await enforcePermission(session.userId, projectId, 'schema:create');

  throw new ValidationError(
    'Profile properties are predefined. Use /api/projects/[id]/schema/users to create computed user schemas instead.'
  );
});
