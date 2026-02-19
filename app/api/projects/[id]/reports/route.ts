/**
 * Project Reports API Routes
 *
 * POST /api/projects/[id]/reports - Create a new report
 * GET /api/projects/[id]/reports - List reports for a project
 *
 * Requirements: 8.7, 8.8
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { createReport, getProjectReports } from '@/lib/report';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateRequiredFields,
  validateStringLength,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/[id]/reports
 * Create a new report
 * Requires editor+ permissions
 *
 * Requirements: 8.7
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

  // Enforce editor+ permissions (report:create)
  await enforcePermission(session.userId, projectId, 'report:create');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['name', 'category']);

  // Validate string length
  validateStringLength(body, {
    name: { min: 1, max: 100 },
    category: { min: 1, max: 50 },
  });

  // Create report
  const report = await createReport(projectId, body.name, body.category);

  return successResponse(report, 201);
});

/**
 * GET /api/projects/[id]/reports
 * List all reports for a project
 * Requires viewer+ permissions
 *
 * Requirements: 8.8
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

  // Enforce viewer+ permissions (report:read)
  await enforcePermission(session.userId, projectId, 'report:read');

  // Get reports
  const reports = await getProjectReports(projectId);

  return successResponse(reports);
});
