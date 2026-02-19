/**
 * Profile Schema Detail API Routes
 *
 * PUT    /api/projects/[id]/schema/profiles/[profileSchemaId] - Not available (profile properties are predefined)
 * DELETE /api/projects/[id]/schema/profiles/[profileSchemaId] - Not available (profile properties are predefined)
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';

/**
 * PUT /api/projects/[id]/schema/profiles/[profileSchemaId]
 * Profile properties are predefined and cannot be updated
 * Use UserSchema API for computed fields instead
 *
 * Requirements: 4.6
 */
export const PUT = withErrorHandler(async (
  _request: NextRequest,
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

  await enforcePermission(session.userId, projectId, 'schema:update');

  throw new ValidationError(
    'Profile properties are predefined and cannot be updated. Use /api/projects/[id]/schema/users to manage computed user schemas instead.'
  );
});

/**
 * DELETE /api/projects/[id]/schema/profiles/[profileSchemaId]
 * Profile properties are predefined and cannot be deleted
 * Use UserSchema API for computed fields instead
 *
 * Requirements: 4.7
 */
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
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

  await enforcePermission(session.userId, projectId, 'schema:delete');

  throw new ValidationError(
    'Profile properties are predefined and cannot be deleted. Use /api/projects/[id]/schema/users to manage computed user schemas instead.'
  );
});
