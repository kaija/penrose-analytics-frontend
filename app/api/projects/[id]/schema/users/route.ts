import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { ConflictError, ValidationError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import type { CreateUserSchemaDTO, UserSchema } from '@/lib/types/user-schema';
import { validateAggregateConfig, validateFormula } from '@/lib/types/user-schema';

// GET /api/projects/[id]/schema/users - List all user schemas
export const GET = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  const params = await context?.params;
  const projectId = params?.id;

  if (!projectId) {
    throw new ValidationError('Project ID is required');
  }

  await enforcePermission(session.userId, projectId, 'schema:read');

  const schemas = await prisma.userSchema.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(schemas);
});

// POST /api/projects/[id]/schema/users - Create a new user schema
export const POST = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  const params = await context?.params;
  const projectId = params?.id;

  if (!projectId) {
    throw new ValidationError('Project ID is required');
  }

  await enforcePermission(session.userId, projectId, 'schema:create');

  const body: CreateUserSchemaDTO = await req.json();

  // Validation
  if (!body.field || !body.displayName || !body.schemaType || !body.dataType) {
    throw new ValidationError('Missing required fields: field, displayName, schemaType, dataType');
  }

  // Validate field name format
  if (!/^[a-z][a-z0-9_]*$/.test(body.field)) {
    throw new ValidationError('Field name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
  }

  // Validate based on schema type
  if (body.schemaType === 'aggregate') {
    if (!body.aggregateConfig) {
      throw new ValidationError('Aggregate config is required for aggregate type schemas');
    }
    const errors = validateAggregateConfig(body.aggregateConfig);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid aggregate config: ${errors.join(', ')}`);
    }
  } else if (body.schemaType === 'formula') {
    if (!body.formula) {
      throw new ValidationError('Formula is required for formula type schemas');
    }
    const errors = validateFormula(body.formula);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid formula: ${errors.join(', ')}`);
    }
  }

  try {
    const schema = await prisma.userSchema.create({
      data: {
        projectId,
        field: body.field,
        displayName: body.displayName,
        description: body.description,
        schemaType: body.schemaType,
        aggregateConfig: body.aggregateConfig as Prisma.JsonValue,
        formula: body.formula,
        dataType: body.dataType,
        format: body.format,
        icon: body.icon,
        category: body.category,
      },
    });

    return NextResponse.json(schema, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`User schema with field '${body.field}' already exists`);
    }
    throw error;
  }
});
