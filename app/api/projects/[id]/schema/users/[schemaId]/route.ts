import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import type { UpdateUserSchemaDTO } from '@/lib/types/user-schema';
import { validateAggregateConfig, validateFormula } from '@/lib/types/user-schema';

// GET /api/projects/[id]/schema/users/[schemaId] - Get a specific user schema
export const GET = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  const params = await context?.params;
  const projectId = params?.id;
  const schemaId = params?.schemaId;

  if (!projectId || !schemaId) {
    throw new ValidationError('Project ID and Schema ID are required');
  }

  await enforcePermission(session.userId, projectId, 'schema:read');

  const schema = await prisma.userSchema.findUnique({
    where: { id: schemaId },
  });

  if (!schema || schema.projectId !== projectId) {
    throw new NotFoundError('User schema not found');
  }

  return NextResponse.json(schema);
});

// PATCH /api/projects/[id]/schema/users/[schemaId] - Update a user schema
export const PATCH = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  const params = await context?.params;
  const projectId = params?.id;
  const schemaId = params?.schemaId;

  if (!projectId || !schemaId) {
    throw new ValidationError('Project ID and Schema ID are required');
  }

  await enforcePermission(session.userId, projectId, 'schema:update');

  const body: UpdateUserSchemaDTO = await req.json();

  // Check if schema exists
  const existing = await prisma.userSchema.findUnique({
    where: { id: schemaId },
  });

  if (!existing || existing.projectId !== projectId) {
    throw new NotFoundError('User schema not found');
  }

  // Validate based on schema type
  if (body.aggregateConfig) {
    const errors = validateAggregateConfig(body.aggregateConfig);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid aggregate config: ${errors.join(', ')}`);
    }
  }

  if (body.formula) {
    const errors = validateFormula(body.formula);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid formula: ${errors.join(', ')}`);
    }
  }

  const updated = await prisma.userSchema.update({
    where: { id: schemaId },
    data: {
      displayName: body.displayName,
      description: body.description,
      aggregateConfig: body.aggregateConfig as Prisma.JsonValue,
      formula: body.formula,
      dataType: body.dataType,
      format: body.format,
      icon: body.icon,
      category: body.category,
    },
  });

  return NextResponse.json(updated);
});

// DELETE /api/projects/[id]/schema/users/[schemaId] - Delete a user schema
export const DELETE = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  const params = await context?.params;
  const projectId = params?.id;
  const schemaId = params?.schemaId;

  if (!projectId || !schemaId) {
    throw new ValidationError('Project ID and Schema ID are required');
  }

  await enforcePermission(session.userId, projectId, 'schema:delete');

  // Check if schema exists
  const existing = await prisma.userSchema.findUnique({
    where: { id: schemaId },
  });

  if (!existing || existing.projectId !== projectId) {
    throw new NotFoundError('User schema not found');
  }

  await prisma.userSchema.delete({
    where: { id: schemaId },
  });

  return NextResponse.json({ success: true });
});
