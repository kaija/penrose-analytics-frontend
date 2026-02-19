/**
 * Projects API Routes
 *
 * POST /api/projects - Create a new project
 * GET /api/projects - List user's projects
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { createProject, getUserProjects } from '@/lib/project';
import { AuthenticationError, AuthorizationError, validateRequiredFields, validateStringLength } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects
 * Create a new project
 *
 * Requirements: 3.1, 3.2
 * Only super admins can create projects
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Check if user is super admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  if (!user) {
    throw new AuthenticationError();
  }

  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isSuperAdmin = superAdminEmails.includes(user.email);

  if (!isSuperAdmin) {
    throw new AuthorizationError('Only super admins can create projects');
  }

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['name']);

  // Validate string length
  validateStringLength(body, {
    name: { min: 1, max: 100 },
  });

  // Create project
  const project = await createProject(session.userId, body.name);

  return successResponse(project, 201);
});

/**
 * GET /api/projects
 * List all projects for the authenticated user
 *
 * Requirements: 3.3
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get user's projects
  const projects = await getUserProjects(session.userId);

  return successResponse(projects);
});
