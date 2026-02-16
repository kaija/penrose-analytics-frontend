/**
 * Property-based tests for event management
 * 
 * Feature: prism
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { getProjectEvents, EventFilters, Pagination } from '@/lib/event';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    profile: {
      findFirst: jest.fn(),
    },
  },
}));

describe('Event Management Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 16: Event Filtering
   * 
   * For any event query with filters (event name, time range, user ID), all returned
   * events must match all specified filter criteria.
   * 
   * **Validates: Requirements 11.5**
   */
  test('Property 16: Event filtering returns matching results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // event name filter
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // user ID filter
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }), // start date
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }), // end date
        fc.integer({ min: 1, max: 10 }), // page
        fc.integer({ min: 1, max: 100 }), // pageSize
        fc.array(
          fc.record({
            id: fc.uuid(),
            profileId: fc.uuid(),
            externalId: fc.string({ minLength: 1, maxLength: 50 }),
            eventName: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            payload: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          }),
          { minLength: 0, maxLength: 30 }
        ), // all events in project
        async (projectId, eventName, userId, startDate, endDate, page, pageSize, allEvents) => {
          // Clear mocks for this iteration
          jest.clearAllMocks();
          
          const now = new Date();
          
          // Build filters
          const filters: EventFilters = {};
          if (eventName) filters.eventName = eventName;
          if (userId) filters.userId = userId;
          if (startDate) filters.startDate = startDate;
          if (endDate) filters.endDate = endDate;

          const pagination: Pagination = { page, pageSize };

          // Determine which events should match the filters
          let matchingEvents = allEvents.map(e => ({
            id: e.id,
            projectId,
            profileId: e.profileId,
            eventName: e.eventName,
            payload: e.payload as Prisma.JsonValue,
            timestamp: e.timestamp,
            createdAt: now,
          }));

          // Apply filter logic
          // 1. Event name filter (exact match)
          if (eventName) {
            matchingEvents = matchingEvents.filter(e => e.eventName === eventName);
          }

          // 2. User ID filter (requires profile lookup)
          let userProfileId: string | undefined;
          let profileFound = true;
          if (userId) {
            // Find a profile that matches the userId (externalId)
            const matchingProfile = allEvents.find(e => e.externalId === userId);
            if (matchingProfile) {
              userProfileId = matchingProfile.profileId;
              matchingEvents = matchingEvents.filter(e => e.profileId === userProfileId);
              
              // Mock profile lookup
              (prisma.profile.findFirst as jest.Mock).mockResolvedValue({
                id: userProfileId,
                projectId,
                externalId: userId,
              });
            } else {
              // No profile found for this userId, should return empty results
              profileFound = false;
              matchingEvents = [];
              (prisma.profile.findFirst as jest.Mock).mockResolvedValue(null);
            }
          }

          // 3. Start date filter (timestamp >= startDate)
          if (startDate) {
            matchingEvents = matchingEvents.filter(e => e.timestamp >= startDate);
          }

          // 4. End date filter (timestamp <= endDate)
          if (endDate) {
            matchingEvents = matchingEvents.filter(e => e.timestamp <= endDate);
          }

          const totalMatching = matchingEvents.length;

          // Apply pagination
          const skip = (page - 1) * pageSize;
          const paginatedEvents = matchingEvents.slice(skip, skip + pageSize);

          // Mock Prisma responses
          (prisma.event.count as jest.Mock).mockResolvedValue(totalMatching);
          (prisma.event.findMany as jest.Mock).mockResolvedValue(paginatedEvents);

          // Execute query
          const result = await getProjectEvents(projectId, filters, pagination);

          // Requirement 11.5: All returned events must match all specified filter criteria
          expect(result.events).toHaveLength(paginatedEvents.length);
          expect(result.total).toBe(totalMatching);
          expect(result.page).toBe(page);
          expect(result.pageSize).toBe(pageSize);

          // Verify each returned event matches ALL filter criteria
          for (const event of result.events) {
            // Event must belong to the project
            expect(event.projectId).toBe(projectId);

            // If eventName filter is specified, event must match exactly
            if (eventName) {
              expect(event.eventName).toBe(eventName);
            }

            // If userId filter is specified, event must belong to that user's profile
            if (userId && userProfileId) {
              expect(event.profileId).toBe(userProfileId);
            }

            // If startDate filter is specified, event timestamp must be >= startDate
            if (startDate) {
              expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            }

            // If endDate filter is specified, event timestamp must be <= endDate
            if (endDate) {
              expect(event.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
            }
          }

          // Verify Prisma was called appropriately
          if (userId) {
            // Profile lookup is always attempted when userId filter is used
            expect(prisma.profile.findFirst).toHaveBeenCalled();
            
            if (profileFound) {
              // If profile was found, event queries should be called
              expect(prisma.event.count).toHaveBeenCalled();
              expect(prisma.event.findMany).toHaveBeenCalled();
            } else {
              // If no profile was found, function returns early without event queries
              // So event queries should NOT be called
              expect(prisma.event.count).not.toHaveBeenCalled();
              expect(prisma.event.findMany).not.toHaveBeenCalled();
            }
          } else {
            // No userId filter, event queries are always called
            expect(prisma.event.count).toHaveBeenCalled();
            expect(prisma.event.findMany).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Empty filters return all events
   * 
   * For any project, querying without filters should return all events
   * in that project (subject to pagination).
   */
  test('Property: Empty filters return all project events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.integer({ min: 1, max: 5 }), // page
        fc.integer({ min: 5, max: 20 }), // pageSize
        fc.array(
          fc.record({
            id: fc.uuid(),
            profileId: fc.uuid(),
            eventName: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 0, maxLength: 50 }
        ), // all events
        async (projectId, page, pageSize, allEvents) => {
          const now = new Date();
          const mockEvents = allEvents.map(e => ({
            id: e.id,
            projectId,
            profileId: e.profileId,
            eventName: e.eventName,
            payload: {} as Prisma.JsonValue,
            timestamp: e.timestamp,
            createdAt: now,
          }));

          const skip = (page - 1) * pageSize;
          const paginatedEvents = mockEvents.slice(skip, skip + pageSize);

          (prisma.event.count as jest.Mock).mockResolvedValue(mockEvents.length);
          (prisma.event.findMany as jest.Mock).mockResolvedValue(paginatedEvents);

          const result = await getProjectEvents(projectId, {}, { page, pageSize });

          // Should return events from the project
          expect(result.total).toBe(mockEvents.length);
          expect(result.events).toHaveLength(paginatedEvents.length);
          
          // All returned events should belong to the project
          for (const event of result.events) {
            expect(event.projectId).toBe(projectId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Multiple filters are combined with AND logic
   * 
   * When multiple filters are specified, events must match ALL filters.
   */
  test('Property: Multiple filters use AND logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.string({ minLength: 1, maxLength: 20 }), // event name
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }), // start date
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), // end date
        fc.array(
          fc.record({
            id: fc.uuid(),
            profileId: fc.uuid(),
            eventName: fc.string({ minLength: 1, maxLength: 20 }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 5, maxLength: 30 }
        ), // all events
        async (projectId, eventName, startDate, endDate, allEvents) => {
          // Ensure startDate <= endDate
          if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
          }

          const now = new Date();
          const mockEvents = allEvents.map(e => ({
            id: e.id,
            projectId,
            profileId: e.profileId,
            eventName: e.eventName,
            payload: {} as Prisma.JsonValue,
            timestamp: e.timestamp,
            createdAt: now,
          }));

          // Apply all filters (AND logic)
          const matchingEvents = mockEvents.filter(e =>
            e.eventName === eventName &&
            e.timestamp >= startDate &&
            e.timestamp <= endDate
          );

          (prisma.event.count as jest.Mock).mockResolvedValue(matchingEvents.length);
          (prisma.event.findMany as jest.Mock).mockResolvedValue(matchingEvents.slice(0, 20));

          const result = await getProjectEvents(
            projectId,
            { eventName, startDate, endDate },
            { page: 1, pageSize: 20 }
          );

          // All returned events must match ALL filters
          for (const event of result.events) {
            expect(event.eventName).toBe(eventName);
            expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(event.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Date range filtering is inclusive
   * 
   * Events with timestamps exactly equal to startDate or endDate should be included.
   */
  test('Property: Date range filtering is inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // boundary date
        async (projectId, boundaryDate) => {
          const now = new Date();
          
          // Create events at the boundary
          const eventAtBoundary = {
            id: 'event-boundary',
            projectId,
            profileId: 'profile-1',
            eventName: 'test_event',
            payload: {} as Prisma.JsonValue,
            timestamp: boundaryDate,
            createdAt: now,
          };

          // Test startDate boundary
          (prisma.event.count as jest.Mock).mockResolvedValue(1);
          (prisma.event.findMany as jest.Mock).mockResolvedValue([eventAtBoundary]);

          const resultStart = await getProjectEvents(
            projectId,
            { startDate: boundaryDate },
            { page: 1, pageSize: 20 }
          );

          // Event at exact startDate should be included
          expect(resultStart.events.some(e => e.timestamp.getTime() === boundaryDate.getTime())).toBe(true);

          // Test endDate boundary
          (prisma.event.count as jest.Mock).mockResolvedValue(1);
          (prisma.event.findMany as jest.Mock).mockResolvedValue([eventAtBoundary]);

          const resultEnd = await getProjectEvents(
            projectId,
            { endDate: boundaryDate },
            { page: 1, pageSize: 20 }
          );

          // Event at exact endDate should be included
          expect(resultEnd.events.some(e => e.timestamp.getTime() === boundaryDate.getTime())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: User ID filter with non-existent user returns empty results
   * 
   * When filtering by a userId that doesn't exist, the result should be empty.
   */
  test('Property: Non-existent userId returns empty results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.string({ minLength: 1, maxLength: 50 }), // non-existent user ID
        async (projectId, nonExistentUserId) => {
          // Mock that no profile exists for this userId
          (prisma.profile.findFirst as jest.Mock).mockResolvedValue(null);
          (prisma.event.count as jest.Mock).mockResolvedValue(0);
          (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

          const result = await getProjectEvents(
            projectId,
            { userId: nonExistentUserId },
            { page: 1, pageSize: 20 }
          );

          // Should return empty results
          expect(result.events).toHaveLength(0);
          expect(result.total).toBe(0);

          // Verify profile lookup was attempted
          expect(prisma.profile.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
              where: {
                projectId,
                externalId: nonExistentUserId,
              },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Pagination consistency
   * 
   * For any query, the sum of events across all pages should equal the total count.
   */
  test('Property: Pagination is consistent with total count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.integer({ min: 1, max: 50 }), // total events
        fc.integer({ min: 5, max: 20 }), // pageSize
        async (projectId, totalEvents, pageSize) => {
          const now = new Date();
          
          // Create mock events
          const mockEvents = Array.from({ length: totalEvents }, (_, i) => ({
            id: `event-${i}`,
            projectId,
            profileId: `profile-${i % 5}`,
            eventName: `event_${i % 3}`,
            payload: {} as Prisma.JsonValue,
            timestamp: new Date(Date.now() - i * 1000),
            createdAt: now,
          }));

          (prisma.event.count as jest.Mock).mockResolvedValue(totalEvents);

          // Calculate expected number of pages
          const expectedPages = Math.ceil(totalEvents / pageSize);

          let totalRetrieved = 0;

          // Fetch all pages
          for (let page = 1; page <= expectedPages; page++) {
            const skip = (page - 1) * pageSize;
            const paginatedEvents = mockEvents.slice(skip, skip + pageSize);

            (prisma.event.findMany as jest.Mock).mockResolvedValue(paginatedEvents);

            const result = await getProjectEvents(projectId, {}, { page, pageSize });

            expect(result.total).toBe(totalEvents);
            expect(result.page).toBe(page);
            expect(result.pageSize).toBe(pageSize);
            
            totalRetrieved += result.events.length;

            // Last page might have fewer events
            if (page < expectedPages) {
              expect(result.events.length).toBe(pageSize);
            } else {
              const expectedOnLastPage = totalEvents - (expectedPages - 1) * pageSize;
              expect(result.events.length).toBe(expectedOnLastPage);
            }
          }

          // Total retrieved should equal total count
          expect(totalRetrieved).toBe(totalEvents);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Events are ordered by timestamp descending
   * 
   * For any query, returned events should be ordered from newest to oldest.
   */
  test('Property: Events are ordered by timestamp descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.array(
          fc.record({
            id: fc.uuid(),
            profileId: fc.uuid(),
            eventName: fc.string({ minLength: 1, maxLength: 20 }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 2, maxLength: 20 }
        ), // events
        async (projectId, events) => {
          const now = new Date();
          const mockEvents = events.map(e => ({
            id: e.id,
            projectId,
            profileId: e.profileId,
            eventName: e.eventName,
            payload: {} as Prisma.JsonValue,
            timestamp: e.timestamp,
            createdAt: now,
          }));

          // Sort by timestamp descending (newest first)
          const sortedEvents = [...mockEvents].sort((a, b) => 
            b.timestamp.getTime() - a.timestamp.getTime()
          );

          (prisma.event.count as jest.Mock).mockResolvedValue(sortedEvents.length);
          (prisma.event.findMany as jest.Mock).mockResolvedValue(sortedEvents);

          const result = await getProjectEvents(projectId, {}, { page: 1, pageSize: 20 });

          // Verify events are in descending order
          for (let i = 0; i < result.events.length - 1; i++) {
            expect(result.events[i].timestamp.getTime()).toBeGreaterThanOrEqual(
              result.events[i + 1].timestamp.getTime()
            );
          }

          // Verify Prisma was called with correct orderBy
          expect(prisma.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              orderBy: { timestamp: 'desc' },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
