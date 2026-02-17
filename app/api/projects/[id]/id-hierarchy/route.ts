/**
 * ID Hierarchy API Routes
 * 
 * GET /api/projects/[id]/id-hierarchy - Get ID hierarchy for a project
 * POST /api/projects/[id]/id-hierarchy - Add a new identity
 * PUT /api/projects/[id]/id-hierarchy - Update identity priorities
 * DELETE /api/projects/[id]/id-hierarchy - Delete an identity
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  validateRequiredFields,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { validateCodeName } from '@/lib/constants/default-identities';

/**
 * GET /api/projects/[id]/id-hierarchy
 * Get ID hierarchy for a project
 * Requires viewer+ permissions
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

  // Enforce viewer+ permissions
  await enforcePermission(session.userId, projectId, 'project:read');

  // Get ID hierarchy, ordered by priority
  const idHierarchy = await prisma.idHierarchy.findMany({
    where: { projectId },
    orderBy: { priority: 'asc' },
  });

  return successResponse(idHierarchy);
});

/**
 * POST /api/projects/[id]/id-hierarchy
 * Add a new identity to the hierarchy
 * Requires editor+ permissions
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

  // Enforce editor+ permissions
  await enforcePermission(session.userId, projectId, 'project:update');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['displayName', 'codeName']);

  const { displayName, codeName, isCustom = true } = body;

  // Validate codeName format
  if (!validateCodeName(codeName)) {
    throw new ValidationError('Code name must match pattern: [a-z]+[_a-z0-9]*');
  }

  // Check if codeName already exists in this project
  const existing = await prisma.idHierarchy.findUnique({
    where: {
      projectId_codeName: {
        projectId,
        codeName,
      },
    },
  });

  if (existing) {
    throw new ValidationError('Code name already exists in this project');
  }

  // Get current max priority
  const maxPriority = await prisma.idHierarchy.findFirst({
    where: { projectId },
    orderBy: { priority: 'desc' },
    select: { priority: true },
  });

  const newPriority = (maxPriority?.priority ?? -1) + 1;

  // Create new identity
  const newIdentity = await prisma.idHierarchy.create({
    data: {
      projectId,
      displayName,
      codeName,
      priority: newPriority,
      isCustom,
    },
  });

  return successResponse(newIdentity, 201);
});

/**
 * PUT /api/projects/[id]/id-hierarchy
 * Update identity priorities (reorder)
 * Requires editor+ permissions
 */
export const PUT = withErrorHandler(async (
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

  // Enforce editor+ permissions
  await enforcePermission(session.userId, projectId, 'project:update');

  // Parse request body
  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['items']);

  const { items } = body;

  if (!Array.isArray(items)) {
    throw new ValidationError('Items must be an array');
  }

  // Update priorities in a transaction
  await prisma.$transaction(
    items.map((item: { id: string; priority: number }) =>
      prisma.idHierarchy.update({
        where: { id: item.id },
        data: { priority: item.priority },
      })
    )
  );

  // Return updated list
  const updated = await prisma.idHierarchy.findMany({
    where: { projectId },
    orderBy: { priority: 'asc' },
  });

  return successResponse(updated);
});

/**
 * DELETE /api/projects/[id]/id-hierarchy
 * Delete an identity from the hierarchy
 * Requires editor+ permissions
 */
export const DELETE = withErrorHandler(async (
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

  // Enforce editor+ permissions
  await enforcePermission(session.userId, projectId, 'project:update');

  // Get itemId from query params
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    throw new ValidationError('Item ID is required');
  }

  // Delete the identity
  await prisma.idHierarchy.delete({
    where: { id: itemId },
  });

  return successResponse({ success: true });
});
