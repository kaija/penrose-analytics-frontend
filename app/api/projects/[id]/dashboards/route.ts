/**
 * Project Dashboards API Routes
 * 
 * POST /api/projects/[id]/dashboards - Create a new dashboard
 * GET /api/projects/[id]/dashboards - List dashboards for a project
 * 
 * Requirements: 7.1, 7.9
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { createDashboard, getProjectDashboards } from '@/lib/dashboard';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateRequiredFields,
  validateStringLength,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/[id]/dashboards
 * Create a new dashboard
 * Requires editor+ permissions
 * 
 * Requirements: 7.9
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

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Enforce editor+ permissions (dashboard:create)
  await enforcePermission(session.userId, projectId, 'dashboard:create');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['name']);

  // Validate string length
  validateStringLength(body, {
    name: { min: 1, max: 100 },
  });

  // Create dashboard
  const dashboard = await createDashboard(projectId, body.name);

  return successResponse(dashboard, 201);
});

/**
 * GET /api/projects/[id]/dashboards
 * List all dashboards for a project
 * Requires viewer+ permissions
 * 
 * Requirements: 7.1
 */
export const GET = withErrorHandler(async (
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

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Enforce viewer+ permissions (dashboard:read)
  await enforcePermission(session.userId, projectId, 'dashboard:read');

  // Get dashboards
  const dashboards = await getProjectDashboards(projectId);

  return successResponse(dashboards);
});
