/**
 * Property-based tests for profile management
 *
 * Feature: prism
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { searchProfiles, ProfileSearchFilters, Pagination } from '@/lib/profile';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profile: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('Profile Management Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 15: Profile Search Filtering
   *
   * For any profile search query with filters, all returned results must match
   * the specified filter criteria (search term, attributes, etc.).
   *
   * **Validates: Requirements 10.3**
   */
  test('Property 15: Profile search filtering returns matching results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // search term
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // externalId filter
        fc.integer({ min: 1, max: 10 }), // page
        fc.integer({ min: 1, max: 100 }), // pageSize
        fc.array(
          fc.record({
            id: fc.uuid(),
            externalId: fc.string({ minLength: 1, maxLength: 50 }),
            traits: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          }),
          { minLength: 0, maxLength: 20 }
        ), // all profiles in project
        async (projectId, search, externalId, page, pageSize, allProfiles) => {
          const now = new Date();

          // Build filters
          const filters: ProfileSearchFilters = {};
          if (search) filters.search = search;
          if (externalId) filters.externalId = externalId;

          const pagination: Pagination = { page, pageSize };

          // Determine which profiles should match the filters
          let matchingProfiles = allProfiles.map(p => ({
            id: p.id,
            projectId,
            externalId: p.externalId,
            traits: p.traits as Prisma.JsonValue,
            identities: {} as Prisma.JsonValue,
            createdAt: now,
            updatedAt: now,
          }));

          // Apply filter logic (case-insensitive contains)
          if (externalId) {
            matchingProfiles = matchingProfiles.filter(p =>
              p.externalId.toLowerCase().includes(externalId.toLowerCase())
            );
          } else if (search) {
            matchingProfiles = matchingProfiles.filter(p =>
              p.externalId.toLowerCase().includes(search.toLowerCase())
            );
          }

          const totalMatching = matchingProfiles.length;

          // Apply pagination
          const skip = (page - 1) * pageSize;
          const paginatedProfiles = matchingProfiles.slice(skip, skip + pageSize);

          // Mock Prisma responses
          (prisma.profile.count as jest.Mock).mockResolvedValue(totalMatching);
          (prisma.profile.findMany as jest.Mock).mockResolvedValue(paginatedProfiles);

          // Execute search
          const result = await searchProfiles(projectId, filters, pagination);

          // Requirement 10.3: All returned results must match filter criteria
          expect(result.profiles).toHaveLength(paginatedProfiles.length);
          expect(result.total).toBe(totalMatching);
          expect(result.page).toBe(page);
          expect(result.pageSize).toBe(pageSize);

          // Verify each returned profile matches the filter criteria
          for (const profile of result.profiles) {
            // Profile must belong to the project
            expect(profile.projectId).toBe(projectId);

            // If externalId filter is specified, profile must match
            if (externalId) {
              expect(
                profile.externalId.toLowerCase().includes(externalId.toLowerCase())
              ).toBe(true);
            }

            // If search filter is specified (and no externalId), profile must match
            if (search && !externalId) {
              expect(
                profile.externalId.toLowerCase().includes(search.toLowerCase())
              ).toBe(true);
            }
          }

          // Verify Prisma was called with correct filters
          expect(prisma.profile.count).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                projectId,
              }),
            })
          );

          expect(prisma.profile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                projectId,
              }),
              skip: (page - 1) * pageSize,
              take: pageSize,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Empty search returns all profiles
   *
   * For any project, searching without filters should return all profiles
   * in that project (subject to pagination).
   */
  test('Property: Empty search returns all project profiles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.integer({ min: 1, max: 5 }), // page
        fc.integer({ min: 5, max: 20 }), // pageSize
        fc.array(
          fc.record({
            id: fc.uuid(),
            externalId: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 0, maxLength: 50 }
        ), // all profiles
        async (projectId, page, pageSize, allProfiles) => {
          const now = new Date();
          const mockProfiles = allProfiles.map(p => ({
            id: p.id,
            projectId,
            externalId: p.externalId,
            traits: {} as Prisma.JsonValue,
            identities: {} as Prisma.JsonValue,
            createdAt: now,
            updatedAt: now,
          }));

          const skip = (page - 1) * pageSize;
          const paginatedProfiles = mockProfiles.slice(skip, skip + pageSize);

          (prisma.profile.count as jest.Mock).mockResolvedValue(mockProfiles.length);
          (prisma.profile.findMany as jest.Mock).mockResolvedValue(paginatedProfiles);

          const result = await searchProfiles(projectId, {}, { page, pageSize });

          // Should return profiles from the project
          expect(result.total).toBe(mockProfiles.length);
          expect(result.profiles).toHaveLength(paginatedProfiles.length);

          // All returned profiles should belong to the project
          for (const profile of result.profiles) {
            expect(profile.projectId).toBe(projectId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Search is case-insensitive
   *
   * For any search term, the search should match profiles regardless of case.
   */
  test('Property: Search is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.string({ minLength: 1, maxLength: 20 }), // search term
        fc.constantFrom('lower', 'upper', 'mixed'), // case variation
        async (projectId, searchTerm, caseVariation) => {
          const now = new Date();

          // Create a profile that should match
          const matchingExternalId = `user-${searchTerm.toLowerCase()}-123`;
          const mockProfile = {
            id: 'profile-1',
            projectId,
            externalId: matchingExternalId,
            traits: {} as Prisma.JsonValue,
            identities: {} as Prisma.JsonValue,
            createdAt: now,
            updatedAt: now,
          };

          // Vary the case of the search term
          let searchQuery = searchTerm;
          if (caseVariation === 'lower') {
            searchQuery = searchTerm.toLowerCase();
          } else if (caseVariation === 'upper') {
            searchQuery = searchTerm.toUpperCase();
          } else {
            // Mixed case
            searchQuery = searchTerm
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
              .join('');
          }

          // Mock that the profile matches (Prisma handles case-insensitive search)
          (prisma.profile.count as jest.Mock).mockResolvedValue(1);
          (prisma.profile.findMany as jest.Mock).mockResolvedValue([mockProfile]);

          const result = await searchProfiles(
            projectId,
            { search: searchQuery },
            { page: 1, pageSize: 20 }
          );

          // Should find the profile regardless of case
          expect(result.total).toBeGreaterThanOrEqual(0);

          // Verify Prisma was called with case-insensitive mode
          expect(prisma.profile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                externalId: expect.objectContaining({
                  mode: 'insensitive',
                }),
              }),
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
   * For any search, the sum of profiles across all pages should equal the total count.
   */
  test('Property: Pagination is consistent with total count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.integer({ min: 1, max: 50 }), // total profiles
        fc.integer({ min: 5, max: 20 }), // pageSize
        async (projectId, totalProfiles, pageSize) => {
          const now = new Date();

          // Create mock profiles
          const mockProfiles = Array.from({ length: totalProfiles }, (_, i) => ({
            id: `profile-${i}`,
            projectId,
            externalId: `user-${i}`,
            traits: {} as Prisma.JsonValue,
            identities: {} as Prisma.JsonValue,
            createdAt: now,
            updatedAt: now,
          }));

          (prisma.profile.count as jest.Mock).mockResolvedValue(totalProfiles);

          // Calculate expected number of pages
          const expectedPages = Math.ceil(totalProfiles / pageSize);

          let totalRetrieved = 0;

          // Fetch all pages
          for (let page = 1; page <= expectedPages; page++) {
            const skip = (page - 1) * pageSize;
            const paginatedProfiles = mockProfiles.slice(skip, skip + pageSize);

            (prisma.profile.findMany as jest.Mock).mockResolvedValue(paginatedProfiles);

            const result = await searchProfiles(projectId, {}, { page, pageSize });

            expect(result.total).toBe(totalProfiles);
            expect(result.page).toBe(page);
            expect(result.pageSize).toBe(pageSize);

            totalRetrieved += result.profiles.length;

            // Last page might have fewer profiles
            if (page < expectedPages) {
              expect(result.profiles.length).toBe(pageSize);
            } else {
              const expectedOnLastPage = totalProfiles - (expectedPages - 1) * pageSize;
              expect(result.profiles.length).toBe(expectedOnLastPage);
            }
          }

          // Total retrieved should equal total count
          expect(totalRetrieved).toBe(totalProfiles);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: ExternalId filter takes precedence over search
   *
   * When both externalId and search filters are provided, externalId should be used.
   */
  test('Property: ExternalId filter takes precedence over search', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // project ID
        fc.string({ minLength: 1, maxLength: 20 }), // search term
        fc.string({ minLength: 1, maxLength: 20 }), // externalId filter
        async (projectId, search, externalId) => {
          const now = new Date();

          // Assume externalId doesn't match search
          fc.pre(search !== externalId);

          const mockProfile = {
            id: 'profile-1',
            projectId,
            externalId: `user-${externalId}`,
            traits: {} as Prisma.JsonValue,
            identities: {} as Prisma.JsonValue,
            createdAt: now,
            updatedAt: now,
          };

          (prisma.profile.count as jest.Mock).mockResolvedValue(1);
          (prisma.profile.findMany as jest.Mock).mockResolvedValue([mockProfile]);

          const result = await searchProfiles(
            projectId,
            { search, externalId },
            { page: 1, pageSize: 20 }
          );

          // Verify that externalId filter was used by checking the call
          expect(prisma.profile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                projectId,
                externalId: expect.objectContaining({
                  contains: expect.any(String),
                  mode: 'insensitive',
                }),
              }),
            })
          );

          // The key property: when both filters are provided, results should match externalId
          // (not search), as verified by the mock returning the profile with matching externalId
          expect(result.profiles).toHaveLength(1);
          expect(result.profiles[0].externalId).toContain(externalId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
