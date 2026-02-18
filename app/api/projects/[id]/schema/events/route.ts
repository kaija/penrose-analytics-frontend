/**
 * Event Schema API Routes
 *
 * GET  /api/projects/[id]/schema/events - Get event schemas (DB-first, inference fallback)
 * POST /api/projects/[id]/schema/events - Create a new event schema
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
import type { EventSchemaResponse, EventSchemaItem, EventPropertySchema, SchemaDataType } from '@/lib/types/schema';

/** Infer property schema from JSON payload samples */
function inferPropertiesFromPayloads(payloads: unknown[]): EventPropertySchema[] {
  const fieldMap = new Map<string, { types: Set<string>; count: number; samples: Set<string> }>();

  for (const payload of payloads) {
    if (payload && typeof payload === 'object') {
      for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { types: new Set(), count: 0, samples: new Set() });
        }
        const entry = fieldMap.get(key)!;
        entry.count++;
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

    const displayName = field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    return {
      field,
      displayName,
      dataType,
      suggestedValues: info.samples.size > 0 ? Array.from(info.samples).slice(0, 20) : undefined,
    };
  });
}

function formatEventName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Demo data for when no real events exist
const DEMO_EVENTS: EventSchemaItem[] = [
  {
    eventName: 'pageview',
    displayName: 'Page view',
    icon: 'file-text',
    count: 125430,
    properties: [
      { field: 'title', displayName: 'Title', dataType: 'string', icon: 'type' },
      { field: 'url', displayName: 'URL', dataType: 'string', icon: 'link' },
      { field: 'domain', displayName: 'Domain', dataType: 'string', icon: 'globe' },
      { field: 'referrer', displayName: 'Referrer', dataType: 'string', icon: 'external-link' },
      { field: 'duration', displayName: 'Duration', dataType: 'duration', icon: 'clock' },
    ],
  },
  {
    eventName: 'button_click',
    displayName: 'Button click',
    icon: 'mouse-pointer',
    count: 89210,
    properties: [
      { field: 'label', displayName: 'Label', dataType: 'string' },
      { field: 'category', displayName: 'Category', dataType: 'string' },
      { field: 'element_id', displayName: 'Element ID', dataType: 'string' },
    ],
  },
  {
    eventName: 'outgoing_link',
    displayName: 'Outgoing link',
    icon: 'external-link',
    count: 34500,
    properties: [
      { field: 'url', displayName: 'URL', dataType: 'string' },
      { field: 'domain', displayName: 'Domain', dataType: 'string' },
    ],
  },
  {
    eventName: 'download',
    displayName: 'Download',
    icon: 'download',
    count: 12300,
    properties: [
      { field: 'file_name', displayName: 'File Name', dataType: 'string' },
      { field: 'file_type', displayName: 'File Type', dataType: 'string' },
      { field: 'file_size', displayName: 'File Size', dataType: 'number' },
    ],
  },
  {
    eventName: 'form_submit',
    displayName: 'Form submit',
    icon: 'send',
    count: 8900,
    properties: [
      { field: 'form_id', displayName: 'Form ID', dataType: 'string' },
      { field: 'form_name', displayName: 'Form Name', dataType: 'string' },
    ],
  },
  {
    eventName: 'signup',
    displayName: 'Sign up',
    icon: 'user-plus',
    count: 4200,
    properties: [
      { field: 'method', displayName: 'Method', dataType: 'string', suggestedValues: ['email', 'google', 'github'] },
      { field: 'plan', displayName: 'Plan', dataType: 'string', suggestedValues: ['free', 'pro', 'enterprise'] },
    ],
  },
  {
    eventName: 'login',
    displayName: 'Login',
    icon: 'log-in',
    count: 67800,
    properties: [
      { field: 'method', displayName: 'Method', dataType: 'string', suggestedValues: ['email', 'google', 'github'] },
    ],
  },
  {
    eventName: 'purchase',
    displayName: 'Purchase',
    icon: 'shopping-cart',
    count: 2100,
    properties: [
      { field: 'amount', displayName: 'Amount', dataType: 'number' },
      { field: 'currency', displayName: 'Currency', dataType: 'string', suggestedValues: ['USD', 'TWD', 'EUR', 'JPY'] },
      { field: 'product', displayName: 'Product', dataType: 'string' },
    ],
  },
];

/**
 * GET /api/projects/[id]/schema/events
 * Get event schemas — DB-first with inference fallback
 * Requires schema:read permission (viewer+)
 *
 * Requirements: 3.3, 3.4
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

  // 1. Try EventSchema table first
  const eventSchemas = await prisma.eventSchema.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  });

  if (eventSchemas.length > 0) {
    const events = eventSchemas.map((es: { id: string; eventName: string; displayName: string; icon: string | null; properties: unknown; createdAt: Date; updatedAt: Date }) => ({
      id: es.id,
      eventName: es.eventName,
      displayName: es.displayName,
      icon: es.icon ?? undefined,
      count: 0,
      properties: (es.properties as EventPropertySchema[]) ?? [],
      createdAt: es.createdAt.toISOString(),
      updatedAt: es.updatedAt.toISOString(),
    }));
    return successResponse({ events });
  }

  // 2. Fallback: infer from real event data
  try {
    const eventNames = await prisma.event.groupBy({
      by: ['eventName'],
      where: { projectId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    if (eventNames.length > 0) {
      const events: EventSchemaItem[] = await Promise.all(
        eventNames.map(async ({ eventName, _count }) => {
          const samples = await prisma.event.findMany({
            where: { projectId, eventName },
            select: { payload: true },
            take: 100,
            orderBy: { timestamp: 'desc' },
          });
          const properties = inferPropertiesFromPayloads(samples.map(s => s.payload));
          return {
            eventName,
            displayName: formatEventName(eventName),
            count: _count.id,
            properties,
          };
        })
      );
      return successResponse({ events } satisfies EventSchemaResponse);
    }
  } catch {
    // Fall through to demo data
  }

  // 3. Return demo data
  return successResponse({ events: DEMO_EVENTS } satisfies EventSchemaResponse);
});

/**
 * POST /api/projects/[id]/schema/events
 * Create a new event schema
 * Requires schema:create permission (admin+)
 *
 * Requirements: 3.5
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
  validateRequiredFields(body, ['eventName', 'displayName', 'properties']);

  // Validate eventName and displayName are non-empty strings
  if (typeof body.eventName !== 'string' || body.eventName.trim().length === 0) {
    throw new ValidationError('eventName is required and cannot be empty');
  }
  if (typeof body.displayName !== 'string' || body.displayName.trim().length === 0) {
    throw new ValidationError('displayName is required and cannot be empty');
  }

  // Validate properties is an array
  if (!Array.isArray(body.properties)) {
    throw new ValidationError('properties must be an array');
  }

  try {
    const eventSchema = await prisma.eventSchema.create({
      data: {
        projectId,
        eventName: body.eventName.trim(),
        displayName: body.displayName.trim(),
        icon: body.icon ?? null,
        properties: body.properties,
      },
    });

    return successResponse(eventSchema, 201);
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) for eventName within project
    if (
      error instanceof Error &&
      error.constructor.name === 'PrismaClientKnownRequestError' &&
      (error as any).code === 'P2002'
    ) {
      throw new ConflictError(
        `An event schema with the name '${body.eventName}' already exists in this project`
      );
    }
    throw error;
  }
});
