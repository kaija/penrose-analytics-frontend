/**
 * Property-based tests for ProfileSchema CRUD API
 *
 * Feature: segment-management, Property 9: ProfileSchema CRUD 往返一致性
 *
 * For any valid ProfileSchema creation request, after creation, the GET /schema/profiles
 * list should contain that profile schema with field values matching the creation request.
 *
 * **Validates: Requirements 4.1, 4.3, 4.5**
 *
 * Testing Framework: fast-check (with Jest)
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[id]/schema/profiles/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import type { SchemaDataType } from '@/lib/types/schema';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profileSchema: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

/**
 * Arbitrary: valid field name (non-empty alphanumeric + underscores)
 */
const arbField = fc
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
 * Arbitrary: optional category string
 */
const arbCategory = fc.option(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
    minLength: 1,
    maxLength: 30,
  }),
  { nil: undefined }
);

/**
 * Arbitrary: optional suggestedValues (string array)
 */
const arbSuggestedValues = fc.option(
  fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  { nil: undefined }
);

describe('ProfileSchema CRUD API Property Tests', () => {
  const mockUserId = 'user-profile-schema-test';
  const mockProjectId = 'project-profile-schema-test';

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      activeProjectId: mockProjectId,
    });
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Feature: segment-management, Property 9: ProfileSchema CRUD 往返一致性
   *
   * For any valid ProfileSchema creation request, after creation, the GET /schema/profiles
   * list should contain that profile schema with field values matching the creation request.
   *
   * **Validates: Requirements 4.1, 4.3, 4.5**
   */
  test('Property 9: ProfileSchema CRUD round-trip consistency — created schema appears in GET list with matching fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbField,
        arbDisplayName,
        arbDataType,
        arbIcon,
        arbCategory,
        arbSuggestedValues,
        async (field, displayName, dataType, icon, category, suggestedValues) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const schemaId = `ps-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          // The record that prisma.profileSchema.create will return
          const createdRecord = {
            id: schemaId,
            projectId: mockProjectId,
            field: field.trim(),
            displayName: displayName.trim(),
            dataType,
            icon: icon ?? null,
            category: category ?? null,
            suggestedValues: suggestedValues ?? null,
            createdAt: now,
            updatedAt: now,
          };

          (prisma.profileSchema.create as jest.Mock).mockResolvedValue(createdRecord);

          // After POST creates the schema, mock findMany to return an array
          // containing the created schema so the DB-first path is taken
          (prisma.profileSchema.findMany as jest.Mock).mockResolvedValue([createdRecord]);

          // Step 1: POST to create the profile schema
          const postBody: Record<string, unknown> = {
            field,
            displayName,
            dataType,
          };
          if (icon !== undefined) postBody.icon = icon;
          if (category !== undefined) postBody.category = category;
          if (suggestedValues !== undefined) postBody.suggestedValues = suggestedValues;

          const postRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/profiles`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const postResponse = await POST(postRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(postResponse.status).toBe(201);

          const postData = await postResponse.json();
          const created = postData.data;

          // Verify POST response contains correct field values (Requirement 4.1, 4.5)
          expect(created.field).toBe(field.trim());
          expect(created.displayName).toBe(displayName.trim());
          expect(created.dataType).toBe(dataType);
          expect(created.icon).toBe(icon ?? null);
          expect(created.category).toBe(category ?? null);
          expect(created.suggestedValues).toEqual(suggestedValues ?? null);
          expect(created.projectId).toBe(mockProjectId);

          // Step 2: GET list to verify the created schema appears (Requirement 4.3)
          const getRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/profiles`
          );

          const getResponse = await GET(getRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(getResponse.status).toBe(200);

          const getData = await getResponse.json();
          const properties = getData.data.properties;

          // The list should contain at least one property
          expect(properties.length).toBeGreaterThanOrEqual(1);

          // Find the created profile schema in the list
          const found = properties.find(
            (p: { field: string }) => p.field === field.trim()
          );

          expect(found).toBeDefined();

          // Round-trip consistency: field values should match creation request
          expect(found.field).toBe(field.trim());
          expect(found.displayName).toBe(displayName.trim());
          expect(found.dataType).toBe(dataType);
          expect(found.icon).toBe(icon ?? undefined);
          expect(found.category).toBe(category ?? undefined);
          expect(found.suggestedValues).toEqual(suggestedValues ?? undefined);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: segment-management, Property 10: ProfileSchema 欄位名稱唯一性
   *
   * For any project and any field name, if a ProfileSchema with that field name
   * already exists in the project, creating another ProfileSchema with the same
   * field should return a 409 Conflict error.
   *
   * **Validates: Requirements 4.2**
   */
  test('Property 10: ProfileSchema field uniqueness — duplicate field returns 409', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbField,
        arbDisplayName,
        arbDataType,
        arbIcon,
        arbCategory,
        arbSuggestedValues,
        async (field, displayName, dataType, icon, category, suggestedValues) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const schemaId = `ps-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          const createdRecord = {
            id: schemaId,
            projectId: mockProjectId,
            field: field.trim(),
            displayName: displayName.trim(),
            dataType,
            icon: icon ?? null,
            category: category ?? null,
            suggestedValues: suggestedValues ?? null,
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

          (prisma.profileSchema.create as jest.Mock)
            .mockResolvedValueOnce(createdRecord)
            .mockRejectedValueOnce(
              new PrismaClientKnownRequestError(
                'Unique constraint failed on the fields: (`projectId`,`field`)',
                { code: 'P2002', meta: { target: ['projectId', 'field'] } }
              )
            );

          // Step 1: First POST should succeed (201)
          const postBody: Record<string, unknown> = {
            field,
            displayName,
            dataType,
          };
          if (icon !== undefined) postBody.icon = icon;
          if (category !== undefined) postBody.category = category;
          if (suggestedValues !== undefined) postBody.suggestedValues = suggestedValues;

          const firstRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/profiles`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const firstResponse = await POST(firstRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });
          expect(firstResponse.status).toBe(201);

          // Step 2: Second POST with same field should return 409 Conflict
          const secondRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/schema/profiles`,
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
});

