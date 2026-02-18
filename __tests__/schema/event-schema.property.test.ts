/**
 * Property-based tests for EventSchema CRUD API
 *
 * Feature: segment-management, Property 7: EventSchema CRUD 往返一致性
 *
 * For any valid EventSchema creation request, after creation, the GET /schema/events
 * list should contain that event schema with field values matching the creation request.
 *
 * **Validates: Requirements 3.1, 3.3, 3.5**
 *
 * Testing Framework: fast-check (with Jest)
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[id]/schema/events/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import type { EventPropertySchema, SchemaDataType } from '@/lib/types/schema';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    eventSchema: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

/**
 * Arbitrary: valid eventName (non-empty alphanumeric + underscores, trimmed)
 */
const arbEventName = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), {
    minLength: 1,
    maxLength: 80,
  })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary: valid displayName (non-empty printable string)
 */
const arbDisplayName = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary: optional icon string
 */
const arbIcon = fc.option(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
    minLength: 1,
    maxLength: 30,
  }),
  { nil: undefined }
);

/**
 * Arbitrary: SchemaDataType
 */
const arbDataType: fc.Arbitrary<SchemaDataType> = fc.constantFrom(
  'string',
  'number',
  'boolean',
  'date',
  'duration'
);

/**
 * Arbitrary: EventPropertySchema array
 */
const arbProperties: fc.Arbitrary<EventPropertySchema[]> = fc.array(
  fc.record({
    field: fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
      { minLength: 1, maxLength: 50 }
    ),
    displayName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    dataType: arbDataType,
    icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    suggestedValues: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
      { nil: undefined }
    ),
  }) as fc.Arbitrary<EventPropertySchema>,
  { minLength: 0, maxLength: 5 }
);

describe('EventSchema CRUD API Property Tests', () => {
  const mockUserId = 'user-event-schema-test';
  const mockProjectId = 'project-event-schema-test';

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      activeProjectId: mockProjectId,
    });
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Feature: segment-management, Property 8: EventSchema 事件名稱唯一性
   *
   * For any project and any eventName, if an EventSchema with that name already
   * exists in the project, creating another EventSchema with the same eventName
   * should return a 409 Conflict error.
   *
   * **Validates: Requirements 3.2**
   */
  test('Property 8: EventSchema eventName uniqueness — duplicate eventName returns 409', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEventName,
        arbDisplayName,
        arbIcon,
        arbProperties,
        async (eventName, displayName, icon, properties) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const schemaId = `es-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          const createdRecord = {
            id: schemaId,
            projectId: mockProjectId,
            eventName: eventName.trim(),
            displayName: displayName.trim(),
            icon: icon ?? null,
            properties,
            createdAt: now,
            updatedAt: now,
          };

          // Build a fake PrismaClientKnownRequestError so constructor.name matches
          class PrismaClientKnownRequestError extends Error {
            code: string;
            meta?: Record<string, unknown>;
            constructor(message: string, opts: { code: string; meta?: Record<string, unknown> }) {
              super(message);
              this.name = 'PrismaClientKnownRequestError';
              this.code = opts.code;
              this.meta = opts.meta;
            }
          }

          (prisma.eventSchema.create as jest.Mock)
            .mockResolvedValueOnce(createdRecord)
            .mockRejectedValueOnce(
              new PrismaClientKnownRequestError(
                'Unique constraint failed on the fields: (`projectId`,`eventName`)',
                { code: 'P2002', meta: { target: ['projectId', 'eventName'] } }
              )
            );

          // Step 1: First POST should succeed (201)
          const postBody: Record<string, unknown> = {
            eventName,
            displayName,
            properties,
          };
          if (icon !== undefined) {
            postBody.icon = icon;
          }

          const firstRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/events`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const firstResponse = await POST(firstRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });
          expect(firstResponse.status).toBe(201);

          // Step 2: Second POST with same eventName should return 409 Conflict
          const secondRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/events`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const secondResponse = await POST(secondRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });
          expect(secondResponse.status).toBe(409);

          const errorData = await secondResponse.json();
          expect(errorData.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: segment-management, Property 7: EventSchema CRUD 往返一致性
   *
   * For any valid EventSchema creation request, after creation, the GET /schema/events
   * list should contain that event schema with field values matching the creation request.
   *
   * **Validates: Requirements 3.1, 3.3, 3.5**
   */
  test('Property 7: EventSchema CRUD round-trip consistency — created schema appears in GET list with matching fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEventName,
        arbDisplayName,
        arbIcon,
        arbProperties,
        async (eventName, displayName, icon, properties) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const schemaId = `es-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          // The record that prisma.eventSchema.create will return
          const createdRecord = {
            id: schemaId,
            projectId: mockProjectId,
            eventName: eventName.trim(),
            displayName: displayName.trim(),
            icon: icon ?? null,
            properties,
            createdAt: now,
            updatedAt: now,
          };

          (prisma.eventSchema.create as jest.Mock).mockResolvedValue(createdRecord);

          // After POST creates the schema, mock findMany to return an array
          // containing the created schema so the DB-first path is taken
          (prisma.eventSchema.findMany as jest.Mock).mockResolvedValue([createdRecord]);

          // Step 1: POST to create the event schema
          const postBody: Record<string, unknown> = {
            eventName,
            displayName,
            properties,
          };
          if (icon !== undefined) {
            postBody.icon = icon;
          }

          const postRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/events`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const postResponse = await POST(postRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(postResponse.status).toBe(201);

          const postData = await postResponse.json();
          const created = postData.data;

          // Verify POST response contains correct field values (Requirement 3.1, 3.5)
          expect(created.eventName).toBe(eventName.trim());
          expect(created.displayName).toBe(displayName.trim());
          expect(created.icon).toBe(icon ?? null);
          expect(created.properties).toEqual(properties);
          expect(created.projectId).toBe(mockProjectId);

          // Step 2: GET list to verify the created schema appears (Requirement 3.3)
          const getRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/events`
          );

          const getResponse = await GET(getRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(getResponse.status).toBe(200);

          const getData = await getResponse.json();
          const events = getData.data.events;

          // The list should contain at least one event
          expect(events.length).toBeGreaterThanOrEqual(1);

          // Find the created event schema in the list
          const found = events.find(
            (e: { eventName: string }) => e.eventName === eventName.trim()
          );

          expect(found).toBeDefined();

          // Round-trip consistency: field values should match creation request
          expect(found.eventName).toBe(eventName.trim());
          expect(found.displayName).toBe(displayName.trim());
          expect(found.icon).toBe(icon ?? undefined);
          expect(found.properties).toEqual(properties);
        }
      ),
      { numRuns: 100 }
    );
  });
});
