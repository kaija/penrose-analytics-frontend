/**
 * Project Profiles API Routes
 *
 * POST /api/projects/[id]/profiles - Upsert a profile
 * GET /api/projects/[id]/profiles - Search profiles
 *
 * Requirements: 10.1, 10.2, 10.3, 10.7
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { upsertProfile, searchProfiles } from '@/lib/profile';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateRequiredFields,
  validateStringLength,
  ValidationError,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/[id]/profiles
 * Upsert a profile (create or update)
 * Requires viewer+ permissions
 *
 * Requirements: 10.1, 10.2
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

  // Enforce viewer+ permissions (profile:read)
  await enforcePermission(session.userId, projectId, 'profile:read');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['externalId', 'traits']);

  // Validate string length
  validateStringLength(body, {
    externalId: { min: 1, max: 255 },
  });

  // Validate traits is an object
  if (typeof body.traits !== 'object' || Array.isArray(body.traits) || body.traits === null) {
    throw new ValidationError('traits must be an object');
  }

  // Upsert profile
  const profile = await upsertProfile(projectId, body.externalId, body.traits);

  return successResponse(profile, 201);
});

/**
 * GET /api/projects/[id]/profiles
 * Search profiles in a project
 * Requires viewer+ permissions
 *
 * Requirements: 10.3, 10.7
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

  // Enforce viewer+ permissions (profile:read)
  await enforcePermission(session.userId, projectId, 'profile:read');

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const externalId = searchParams.get('externalId') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Validate pagination parameters
  if (page < 1) {
    throw new ValidationError('page must be greater than 0');
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new ValidationError('pageSize must be between 1 and 100');
  }

  // Search profiles
  const result = await searchProfiles(
    projectId,
    { search, externalId },
    { page, pageSize }
  );

  return successResponse(result);
});
