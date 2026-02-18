/**
 * Profile Schema API Routes
 *
 * GET  /api/projects/[id]/schema/profiles - Get profile schemas (DB-first, inference fallback)
 * POST /api/projects/[id]/schema/profiles - Create a new profile schema
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  validateRequiredFields,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import type { ProfileSchemaResponse, ProfilePropertySchema, SchemaDataType } from '@/lib/types/schema';


const VALID_DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];

function inferPropertiesFromTraits(traits: unknown[]): ProfilePropertySchema[] {
  const fieldMap = new Map<string, { types: Set<string>; samples: Set<string> }>();

  for (const t of traits) {
    if (t && typeof t === 'object') {
      for (const [key, val] of Object.entries(t as Record<string, unknown>)) {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { types: new Set(), samples: new Set() });
        }
        const entry = fieldMap.get(key)!;
        if (val !== null && val !== undefined) {
          entry.types.add(typeof val);
          if (typeof val === 'string' && entry.samples.size < 20) {
            entry.samples.add(val);
          }
        }
      }
    }
  }

  return Array.from(fieldMap.entries()).map(([field, info]) => {
    let dataType: SchemaDataType = 'string';
    if (info.types.has('number')) dataType = 'number';
    else if (info.types.has('boolean')) dataType = 'boolean';

    return {
      field,
      displayName: field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      dataType,
      suggestedValues: info.samples.size > 0 ? Array.from(info.samples).slice(0, 20) : undefined,
    };
  });
}

const DEMO_PROPERTIES: ProfilePropertySchema[] = [
  { field: 'region', displayName: 'Most Recent Region', dataType: 'string', icon: 'map-pin', category: 'demographics' },
  { field: 'stickiness', displayName: 'Stickiness', dataType: 'number', icon: 'trending-up', category: 'behavior' },
  { field: 'avg_session_length', displayName: 'Avg Session Length', dataType: 'duration', icon: 'clock', category: 'behavior' },
  { field: 'avg_screens_per_session', displayName: 'Avg Screens per Session', dataType: 'number', icon: 'monitor', category: 'behavior' },
  { field: 'plan', displayName: 'Plan', dataType: 'string', icon: 'credit-card', category: 'account', suggestedValues: ['free', 'pro', 'enterprise'] },
  { field: 'country', displayName: 'Country', dataType: 'string', icon: 'flag', category: 'demographics', suggestedValues: ['TW', 'US', 'JP', 'KR', 'DE', 'AU', 'SG'] },
  { field: 'city', displayName: 'City', dataType: 'string', icon: 'map', category: 'demographics' },
  { field: 'browser', displayName: 'Browser', dataType: 'string', icon: 'globe', category: 'system', suggestedValues: ['Chrome', 'Firefox', 'Safari', 'Edge'] },
  { field: 'os', displayName: 'Operating System', dataType: 'string', icon: 'monitor', category: 'system', suggestedValues: ['macOS', 'Windows', 'Linux', 'iOS', 'Android'] },
  { field: 'signup_date', displayName: 'Signup Date', dataType: 'date', icon: 'calendar', category: 'account' },
  { field: 'last_seen', displayName: 'Last Seen', dataType: 'date', icon: 'clock', category: 'behavior' },
  { field: 'total_sessions', displayName: 'Total Sessions', dataType: 'number', icon: 'activity', category: 'behavior' },
  { field: 'company', displayName: 'Company', dataType: 'string', icon: 'building', category: 'demographics' },
  { field: 'email', displayName: 'Email', dataType: 'string', icon: 'mail', category: 'identity' },
  { field: 'name', displayName: 'Name', dataType: 'string', icon: 'user', category: 'identity' },
];

/**
 * GET /api/projects/[id]/schema/profiles
 * Get profile schemas — DB-first with inference fallback
 * Requires schema:read permission (viewer+)
 *
 * Requirements: 4.3, 4.4
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) throw new AuthenticationError();

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) throw new NotFoundError('Project');

  await enforcePermission(session.userId, projectId, 'schema:read');

  // 1. Try ProfileSchema table first
  const profileSchemas = await prisma.profileSchema.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  });

  if (profileSchemas.length > 0) {
    const properties = profileSchemas.map(
      (ps: { id: string; field: string; displayName: string; dataType: string; icon: string | null; category: string | null; suggestedValues: unknown; createdAt: Date; updatedAt: Date }) => ({
        id: ps.id,
        field: ps.field,
        displayName: ps.displayName,
        dataType: ps.dataType as SchemaDataType,
        icon: ps.icon ?? undefined,
        category: ps.category ?? undefined,
        suggestedValues: (ps.suggestedValues as string[]) ?? undefined,
        createdAt: ps.createdAt.toISOString(),
        updatedAt: ps.updatedAt.toISOString(),
      })
    );
    return successResponse({ properties });
  }

  // 2. Fallback: infer from real profile data
  try {
    const samples = await prisma.profile.findMany({
      where: { projectId },
      select: { traits: true },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });

    if (samples.length > 0) {
      const properties = inferPropertiesFromTraits(samples.map(s => s.traits));
      if (properties.length > 0) {
        return successResponse({ properties } satisfies ProfileSchemaResponse);
      }
    }
  } catch {
    // Fall through to demo data
  }

  // 3. Return demo data
  return successResponse({ properties: DEMO_PROPERTIES } satisfies ProfileSchemaResponse);
});

/**
 * POST /api/projects/[id]/schema/profiles
 * Create a new profile schema
 * Requires schema:create permission (admin+)
 *
 * Requirements: 4.5
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) throw new AuthenticationError();

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) throw new NotFoundError('Project');

  await enforcePermission(session.userId, projectId, 'schema:create');

  const body = await request.json();

  // Validate required fields
  validateRequiredFields(body, ['field', 'displayName', 'dataType']);

  // Validate field and displayName are non-empty strings
  if (typeof body.field !== 'string' || body.field.trim().length === 0) {
    throw new ValidationError('field is required and cannot be empty');
  }
  if (typeof body.displayName !== 'string' || body.displayName.trim().length === 0) {
    throw new ValidationError('displayName is required and cannot be empty');
  }

  // Validate dataType is one of the allowed values
  if (!VALID_DATA_TYPES.includes(body.dataType)) {
    throw new ValidationError(
      `dataType must be one of: ${VALID_DATA_TYPES.join(', ')}`
    );
  }

  try {
    const profileSchema = await prisma.profileSchema.create({
      data: {
        projectId,
        field: body.field.trim(),
        displayName: body.displayName.trim(),
        dataType: body.dataType,
        icon: body.icon ?? null,
        category: body.category ?? null,
        suggestedValues: body.suggestedValues ?? null,
      },
    });

    return successResponse(profileSchema, 201);
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) for field within project
    if (
      error instanceof Error &&
      error.constructor.name === 'PrismaClientKnownRequestError' &&
      (error as any).code === 'P2002'
    ) {
      throw new ConflictError(
        `A profile schema with the field '${body.field}' already exists in this project`
      );
    }
    throw error;
  }
});
