/**
 * Project Members API Routes
 * 
 * GET /api/projects/[id]/members - List project members
 * 
 * Requirements: 17.1
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getUserRole, getProjectMembers } from '@/lib/project';
import { 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/[id]/members
 * List all members of a project
 * Only owners and admins can view members
 * 
 * Requirements: 17.1
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

  // Check user's role in the project
  const role = await getUserRole(session.userId, projectId);
  if (!role) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners and admins can view members
  if (role !== 'owner' && role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can view members');
  }

  // Get project members
  const members = await getProjectMembers(projectId);

  return successResponse(members);
});
