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
import { AuthenticationError, validateRequiredFields, validateStringLength } from '@/lib/errors';

/**
 * POST /api/projects
 * Create a new project
 * 
 * Requirements: 3.1, 3.2
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
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
