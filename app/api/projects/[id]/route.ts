/**
 * Project Detail API Routes
 * 
 * PUT /api/projects/[id] - Update a project
 * 
 * Requirements: 3.1
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import { 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  validateStringLength 
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/projects/[id]
 * Update a project
 * Only owners and admins can update projects
 * 
 * Requirements: 3.1
 */
export const PUT = withErrorHandler(async (
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

  // Only owners and admins can update projects
  if (role !== 'owner' && role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can update projects');
  }

  // Parse request body
  const body = await request.json();

  // Validate string length if name is provided
  if (body.name !== undefined) {
    validateStringLength(body, {
      name: { min: 1, max: 100 },
    });
  }

  // Update project
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
    },
  });

  return successResponse(updatedProject);
});
