/**
 * Project Switch API Route
 * 
 * POST /api/projects/[id]/switch - Switch active project
 * 
 * Requirements: 3.4
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession, updateActiveProject } from '@/lib/session';
import { switchProject } from '@/lib/project';
import { AuthenticationError, NotFoundError } from '@/lib/errors';

/**
 * POST /api/projects/[id]/switch
 * Switch the active project for the authenticated user
 * 
 * Requirements: 3.4
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

  // Validate user has access to the project
  // This will throw AuthorizationError if user doesn't have access
  await switchProject(session.userId, projectId);

  // Update the session with the new active project
  await updateActiveProject(projectId);

  return successResponse({ 
    message: 'Project switched successfully',
    activeProjectId: projectId 
  });
});
