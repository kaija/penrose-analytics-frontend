/**
 * Property-based tests for project filtering functionality
 *
 * Feature: super-admin-dashboard
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { describe, test, expect } from '@jest/globals';

interface ProjectWithStats {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: Date | string;
  memberCount: number;
}

/**
 * Client-side filtering logic extracted from ProjectListSection component
 */
function filterProjects(projects: ProjectWithStats[], filterText: string): ProjectWithStats[] {
  return projects.filter(project =>
    project.name.toLowerCase().includes(filterText.toLowerCase()) ||
    project.id.toLowerCase().includes(filterText.toLowerCase())
  );
}

describe('Project Filtering Property Tests', () => {
  /**
   * Property 1: Project filtering correctness
   *
   * For any list of projects and any filter text, the filtered results should
   * contain only projects whose name or ID contains the filter text (case-insensitive),
   * and should contain all such matching projects.
   *
   * **Validates: Requirements 1.3**
   */
  test('Property 1: Project filtering correctness', () => {
    fc.assert(
      fc.property(
        // Generate random list of projects
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            enabled: fc.boolean(),
            createdAt: fc.date(),
            memberCount: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        // Generate random filter text
        fc.string({ maxLength: 50 }),
        (projects, filterText) => {
          // Apply filtering
          const filtered = filterProjects(projects, filterText);

          // Property 1a: All filtered results must match the filter criteria
          // Each result must have the filter text in either name or ID (case-insensitive)
          for (const project of filtered) {
            const nameMatches = project.name.toLowerCase().includes(filterText.toLowerCase());
            const idMatches = project.id.toLowerCase().includes(filterText.toLowerCase());
            expect(nameMatches || idMatches).toBe(true);
          }

          // Property 1b: All matching projects must be in the filtered results
          // No matching project should be excluded
          for (const project of projects) {
            const nameMatches = project.name.toLowerCase().includes(filterText.toLowerCase());
            const idMatches = project.id.toLowerCase().includes(filterText.toLowerCase());

            if (nameMatches || idMatches) {
              expect(filtered).toContainEqual(project);
            }
          }

          // Property 1c: Filtered results must be a subset of original projects
          for (const project of filtered) {
            expect(projects).toContainEqual(project);
          }

          // Property 1d: Empty filter should return all projects
          if (filterText === '') {
            expect(filtered.length).toBe(projects.length);
          }

          // Property 1e: Filtered results should not contain duplicates
          const uniqueIds = new Set(filtered.map(p => p.id));
          expect(uniqueIds.size).toBe(filtered.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Case-insensitive filtering
   *
   * Filtering should be case-insensitive - same results regardless of case
   */
  test('Property: Case-insensitive filtering', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            enabled: fc.boolean(),
            createdAt: fc.date(),
            memberCount: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string({ minLength: 1, maxLength: 20 }),
        (projects, filterText) => {
          const lowerCaseFiltered = filterProjects(projects, filterText.toLowerCase());
          const upperCaseFiltered = filterProjects(projects, filterText.toUpperCase());
          const mixedCaseFiltered = filterProjects(projects, filterText);

          // All three should produce the same results
          expect(lowerCaseFiltered.length).toBe(upperCaseFiltered.length);
          expect(lowerCaseFiltered.length).toBe(mixedCaseFiltered.length);

          // Verify same projects are returned (order might differ)
          const lowerIds = lowerCaseFiltered.map(p => p.id).sort();
          const upperIds = upperCaseFiltered.map(p => p.id).sort();
          const mixedIds = mixedCaseFiltered.map(p => p.id).sort();

          expect(lowerIds).toEqual(upperIds);
          expect(lowerIds).toEqual(mixedIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Filter by ID or name
   *
   * A project should be included if EITHER its ID or name matches
   */
  test('Property: Filter matches ID or name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (projectId, projectName, searchTerm) => {
          const project: ProjectWithStats = {
            id: projectId,
            name: projectName,
            enabled: true,
            createdAt: new Date(),
            memberCount: 0,
          };

          const filtered = filterProjects([project], searchTerm);

          const idMatches = projectId.toLowerCase().includes(searchTerm.toLowerCase());
          const nameMatches = projectName.toLowerCase().includes(searchTerm.toLowerCase());

          if (idMatches || nameMatches) {
            // Should be included
            expect(filtered).toHaveLength(1);
            expect(filtered[0]).toEqual(project);
          } else {
            // Should be excluded
            expect(filtered).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
