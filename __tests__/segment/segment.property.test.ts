/**
 * Property-based tests for Segment CRUD API
 *
 * Feature: segment-management
 * Testing Framework: fast-check (with Jest)
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET as GET_LIST, POST } from '@/app/api/projects/[id]/segments/route';
import { GET, PUT, DELETE } from '@/app/api/projects/[id]/segments/[segmentId]/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    segment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

/**
 * Arbitrary: valid segment name (1-200 printable characters, trimmed non-empty)
 */
const arbSegmentName = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary: valid filterConfig object with filters array and timeRange
 */
const arbFilterConfig = fc.record({
  filters: fc.array(
    fc.record({
      id: fc.uuid(),
      filterType: fc.constantFrom('event' as const, 'property' as const),
      constraints: fc.array(
        fc.record({
          id: fc.uuid(),
          field: fc.string({ minLength: 1, maxLength: 50 }),
          displayName: fc.string({ minLength: 1, maxLength: 50 }),
          dataType: fc.constantFrom('string', 'number', 'boolean', 'date', 'duration'),
          operator: fc.constantFrom('is', 'is_not', 'contains', 'equals'),
          values: fc.array(fc.oneof(fc.string({ maxLength: 20 }), fc.integer()), {
            minLength: 0,
            maxLength: 3,
          }),
        }),
        { minLength: 0, maxLength: 3 }
      ),
    }),
    { minLength: 0, maxLength: 5 }
  ),
  timeRange: fc.record({
    from: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map((d) =>
      d.toISOString().slice(0, 10)
    ),
    to: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map((d) =>
      d.toISOString().slice(0, 10)
    ),
  }),
});

describe('Segment CRUD API Property Tests', () => {
  const mockUserId = 'user-prop-test';
  const mockProjectId = 'project-prop-test';

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      activeProjectId: mockProjectId,
    });
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Feature: segment-management, Property 2: Segment 名稱唯一性
   *
   * For any project and any Segment name, if a Segment with that name already
   * exists in the project, creating another Segment with the same name should
   * return a 409 Conflict error.
   *
   * **Validates: Requirements 1.5, 2.6**
   */
  test('Property 2: Segment name uniqueness — duplicate name returns 409', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSegmentName,
        arbFilterConfig,
        async (name, filterConfig) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const segmentId = `seg-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          const createdSegment = {
            id: segmentId,
            projectId: mockProjectId,
            name: name.trim(),
            description: null,
            filterConfig,
            createdBy: mockUserId,
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

          (prisma.segment.create as jest.Mock)
            .mockResolvedValueOnce(createdSegment)
            .mockRejectedValueOnce(
              new PrismaClientKnownRequestError(
                'Unique constraint failed on the fields: (`projectId`,`name`)',
                { code: 'P2002', meta: { target: ['projectId', 'name'] } }
              )
            );

          // Step 1: First POST should succeed (201)
          const postBody = { name, filterConfig };
          const firstRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const firstResponse = await POST(firstRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });
          expect(firstResponse.status).toBe(201);

          // Step 2: Second POST with same name should return 409 Conflict
          const secondRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`,
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
   * Feature: segment-management, Property 1: Segment CRUD 往返一致性
   *
   * For any valid Segment creation request (with valid name and filterConfig),
   * after creation, reading the same Segment via GET should return data containing
   * the same name, description, filterConfig, and projectId/createdBy should match
   * the request's project ID and authenticated user ID.
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.3**
   */
  test('Property 1: Segment CRUD round-trip consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSegmentName,
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
        arbFilterConfig,
        async (name, description, filterConfig) => {
          const segmentId = `seg-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          // The segment that prisma.segment.create will return
          const createdSegment = {
            id: segmentId,
            projectId: mockProjectId,
            name: name.trim(),
            description: description ?? null,
            filterConfig,
            createdBy: mockUserId,
            createdAt: now,
            updatedAt: now,
          };

          (prisma.segment.create as jest.Mock).mockResolvedValue(createdSegment);
          (prisma.segment.findFirst as jest.Mock).mockResolvedValue(createdSegment);

          // Step 1: POST to create the segment
          const postBody: Record<string, unknown> = { name, filterConfig };
          if (description !== undefined) {
            postBody.description = description;
          }

          const postRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`,
            {
              method: 'POST',
              body: JSON.stringify(postBody),
            }
          );

          const postResponse = await POST(postRequest, {
            params: Promise.resolve({ id: mockProjectId }),
          });
          const postData = await postResponse.json();

          expect(postResponse.status).toBe(201);

          const created = postData.data;

          // Step 2: GET to read back the segment
          const getRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments/${created.id}`
          );

          const getResponse = await GET(getRequest, {
            params: Promise.resolve({ id: mockProjectId, segmentId: created.id }),
          });
          const getData = await getResponse.json();

          expect(getResponse.status).toBe(200);

          const fetched = getData.data;

          // Round-trip consistency assertions
          // Requirement 1.1: name, description, filterConfig are preserved
          expect(fetched.name).toBe(name.trim());
          expect(fetched.description).toBe(description ?? null);
          expect(fetched.filterConfig).toEqual(filterConfig);

          // Requirement 1.2: projectId matches the request's project ID
          expect(fetched.projectId).toBe(mockProjectId);

          // Requirement 1.3: createdBy matches the authenticated user ID
          expect(fetched.createdBy).toBe(mockUserId);

          // The created and fetched segments should be identical
          expect(fetched.id).toBe(created.id);
          expect(fetched.name).toBe(created.name);
          expect(fetched.filterConfig).toEqual(created.filterConfig);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: segment-management, Property 3: Segment 列表排序
   *
   * For any set of multiple Segments in a project, the GET list API should
   * return Segments ordered by updatedAt descending.
   *
   * **Validates: Requirements 2.2**
   */
  test('Property 3: Segment list ordering — segments returned by updatedAt descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: arbSegmentName,
            description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            filterConfig: arbFilterConfig,
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (segmentInputs) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          // Build full segment objects
          const segments = segmentInputs.map((s) => ({
            id: s.id,
            projectId: mockProjectId,
            name: s.name.trim(),
            description: s.description,
            filterConfig: s.filterConfig,
            createdBy: mockUserId,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          }));

          // Sort by updatedAt descending — this is what Prisma would return
          const sortedSegments = [...segments].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          );

          (prisma.segment.findMany as jest.Mock).mockResolvedValue(sortedSegments);

          // Call GET list API
          const request = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`
          );

          const response = await GET_LIST(request, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(response.status).toBe(200);

          const data = await response.json();
          const returnedSegments = data.data.segments;

          // Verify the response contains the correct number of segments
          expect(returnedSegments).toHaveLength(sortedSegments.length);

          // Verify ordering: each segment's updatedAt should be >= the next one's
          for (let i = 0; i < returnedSegments.length - 1; i++) {
            const currentUpdatedAt = new Date(returnedSegments[i].updatedAt).getTime();
            const nextUpdatedAt = new Date(returnedSegments[i + 1].updatedAt).getTime();
            expect(currentUpdatedAt).toBeGreaterThanOrEqual(nextUpdatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: segment-management, Property 4: Segment 更新往返一致性
   *
   * For any existing Segment and valid update data, after PUT update,
   * reading the same Segment via GET should return data reflecting
   * the updated field values.
   *
   * **Validates: Requirements 2.4**
   */
  test('Property 4: Segment update round-trip consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSegmentName,
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
        arbFilterConfig,
        arbSegmentName,
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
        arbFilterConfig,
        async (origName, origDesc, origFilter, newName, newDesc, newFilter) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const segmentId = `seg-${Math.random().toString(36).slice(2)}`;
          const createdAt = new Date('2024-01-01');
          const updatedAt = new Date('2024-06-01');

          // The existing segment before update
          const existingSegment = {
            id: segmentId,
            projectId: mockProjectId,
            name: origName.trim(),
            description: origDesc,
            filterConfig: origFilter,
            createdBy: mockUserId,
            createdAt,
            updatedAt,
          };

          // The segment after update (what prisma.segment.update returns)
          const updatedSegment = {
            ...existingSegment,
            name: newName.trim(),
            description: newDesc,
            filterConfig: newFilter,
            updatedAt: new Date(),
          };

          // PUT handler calls findFirst (to verify existence) then update
          // GET handler calls findFirst to retrieve the segment
          (prisma.segment.findFirst as jest.Mock)
            .mockResolvedValueOnce(existingSegment)   // PUT: existence check
            .mockResolvedValueOnce(updatedSegment);    // GET: read back
          (prisma.segment.update as jest.Mock).mockResolvedValue(updatedSegment);

          // Step 1: PUT to update the segment
          const putBody = {
            name: newName,
            description: newDesc,
            filterConfig: newFilter,
          };
          const putRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments/${segmentId}`,
            { method: 'PUT', body: JSON.stringify(putBody) }
          );

          const putResponse = await PUT(putRequest, {
            params: Promise.resolve({ id: mockProjectId, segmentId }),
          });
          expect(putResponse.status).toBe(200);

          const putData = await putResponse.json();
          const updated = putData.data;

          // Step 2: GET to read back the updated segment
          const getRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments/${segmentId}`
          );

          const getResponse = await GET(getRequest, {
            params: Promise.resolve({ id: mockProjectId, segmentId }),
          });
          expect(getResponse.status).toBe(200);

          const getData = await getResponse.json();
          const fetched = getData.data;

          // Round-trip consistency: PUT response should reflect updated values
          expect(updated.name).toBe(newName.trim());
          expect(updated.description).toBe(newDesc);
          expect(updated.filterConfig).toEqual(newFilter);

          // Round-trip consistency: GET after PUT should match updated values
          expect(fetched.name).toBe(newName.trim());
          expect(fetched.description).toBe(newDesc);
          expect(fetched.filterConfig).toEqual(newFilter);

          // The fetched segment should match the PUT response
          expect(fetched.id).toBe(updated.id);
          expect(fetched.name).toBe(updated.name);
          expect(fetched.description).toBe(updated.description);
          expect(fetched.filterConfig).toEqual(updated.filterConfig);

          // Immutable fields should be preserved
          expect(fetched.projectId).toBe(mockProjectId);
          expect(fetched.createdBy).toBe(mockUserId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: segment-management, Property 5: Segment 刪除後不可存取
   *
   * For any existing Segment, after DELETE, reading the same Segment via GET
   * should return 404 Not Found.
   *
   * **Validates: Requirements 2.5**
   */
  test('Property 5: Segment deletion — deleted segment returns 404 on GET', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSegmentName,
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
        arbFilterConfig,
        async (name, description, filterConfig) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const segmentId = `seg-${Math.random().toString(36).slice(2)}`;
          const now = new Date();

          // The existing segment
          const existingSegment = {
            id: segmentId,
            projectId: mockProjectId,
            name: name.trim(),
            description,
            filterConfig,
            createdBy: mockUserId,
            createdAt: now,
            updatedAt: now,
          };

          // DELETE handler: findFirst returns existing segment, then delete succeeds
          // GET handler after delete: findFirst returns null (segment no longer exists)
          (prisma.segment.findFirst as jest.Mock)
            .mockResolvedValueOnce(existingSegment)  // DELETE: existence check
            .mockResolvedValueOnce(null);             // GET: segment not found
          (prisma.segment.delete as jest.Mock).mockResolvedValue(existingSegment);

          // Step 1: DELETE the segment — should return 200
          const deleteRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments/${segmentId}`,
            { method: 'DELETE' }
          );

          const deleteResponse = await DELETE(deleteRequest, {
            params: Promise.resolve({ id: mockProjectId, segmentId }),
          });
          expect(deleteResponse.status).toBe(200);

          const deleteData = await deleteResponse.json();
          expect(deleteData.data.message).toBe('Segment deleted successfully');

          // Step 2: GET the deleted segment — should return 404
          const getRequest = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments/${segmentId}`
          );

          const getResponse = await GET(getRequest, {
            params: Promise.resolve({ id: mockProjectId, segmentId }),
          });
          expect(getResponse.status).toBe(404);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: segment-management, Property 6: Segment 名稱驗證
 *
 * For any empty string or string longer than 200 characters used as a Segment name,
 * the create API should reject the request and return a validation error (400).
 *
 * **Validates: Requirements 2.10**
 */
describe('Property 6: Segment name validation', () => {
  const mockUserId = 'user-prop6-test';
  const mockProjectId = 'project-prop6-test';

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      activeProjectId: mockProjectId,
    });
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Sub-property 6.1: Empty or whitespace-only names should be rejected with 400
   *
   * **Validates: Requirements 2.10**
   */
  test('Sub-property 6.1: Empty or whitespace-only names → POST returns 400', async () => {
    // Arbitrary: empty string or whitespace-only string
    const arbEmptyOrWhitespaceName = fc.oneof(
      fc.constant(''),
      fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 })
    );

    await fc.assert(
      fc.asyncProperty(
        arbEmptyOrWhitespaceName,
        arbFilterConfig,
        async (name, filterConfig) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const postBody = { name, filterConfig };
          const request = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const response = await POST(request, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(response.status).toBe(400);

          const data = await response.json();
          expect(data.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sub-property 6.2: Names longer than 200 characters should be rejected with 400
   *
   * **Validates: Requirements 2.10**
   */
  test('Sub-property 6.2: Names longer than 200 characters → POST returns 400', async () => {
    // Arbitrary: string with length > 200 (201 to 500 printable characters)
    const arbTooLongName = fc.string({ minLength: 201, maxLength: 500 }).filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        arbTooLongName,
        arbFilterConfig,
        async (name, filterConfig) => {
          jest.clearAllMocks();
          (validateSession as jest.Mock).mockResolvedValue({
            userId: mockUserId,
            activeProjectId: mockProjectId,
          });
          (enforcePermission as jest.Mock).mockResolvedValue(undefined);

          const postBody = { name, filterConfig };
          const request = new NextRequest(
            `http://localhost/api/projects/${mockProjectId}/segments`,
            { method: 'POST', body: JSON.stringify(postBody) }
          );

          const response = await POST(request, {
            params: Promise.resolve({ id: mockProjectId }),
          });

          expect(response.status).toBe(400);

          const data = await response.json();
          expect(data.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

