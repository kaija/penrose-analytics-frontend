/**
 * Project Switch API Route
 * 
 * POST /api/projects/[id]/switch - Switch active project
 * 
 * Requirements: 3.4, 3.12
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { switchProject } from '@/lib/project';
import { 
  AuthenticationError,
  NotFoundError
} from '@/lib/errors';

/**
 * POST /api/projects/[id]/switch
 * Switch the active project in the session
 * 
 * Requirements: 3.4, 3.12
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get project ID from params
  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  // Switch to the project
  await switchProject(session.userId, projectId);

  return successResponse({ 
    message: 'Project switched successfully',
    projectId 
  });
});
