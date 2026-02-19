/**
 * Unit tests for project filtering edge cases
 *
 * Feature: super-admin-dashboard
 * Testing Framework: Jest
 */

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

describe('Project Filtering Unit Tests', () => {
  const mockProjects: ProjectWithStats[] = [
    {
      id: 'proj-123',
      name: 'Alpha Project',
      enabled: true,
      createdAt: new Date('2024-01-01'),
      memberCount: 5,
    },
    {
      id: 'proj-456',
      name: 'Beta Project',
      enabled: false,
      createdAt: new Date('2024-02-01'),
      memberCount: 3,
    },
    {
      id: 'proj-789',
      name: 'Gamma Project',
      enabled: true,
      createdAt: new Date('2024-03-01'),
      memberCount: 10,
    },
  ];

  /**
   * Requirement 1.4: Empty filter should return all projects
   */
  test('empty filter returns all projects', () => {
    const result = filterProjects(mockProjects, '');
    expect(result).toHaveLength(3);
    expect(result).toEqual(mockProjects);
  });

  /**
   * Requirement 1.3: Filter by project name
   */
  test('filter by project name', () => {
    const result = filterProjects(mockProjects, 'Alpha');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha Project');
  });

  /**
   * Requirement 1.3: Filter by project ID
   */
  test('filter by project ID', () => {
    const result = filterProjects(mockProjects, '456');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('proj-456');
  });

  /**
   * Requirement 1.3: Case-insensitive filtering
   */
  test('case-insensitive filtering', () => {
    const lowerResult = filterProjects(mockProjects, 'alpha');
    const upperResult = filterProjects(mockProjects, 'ALPHA');
    const mixedResult = filterProjects(mockProjects, 'AlPhA');

    expect(lowerResult).toHaveLength(1);
    expect(upperResult).toHaveLength(1);
    expect(mixedResult).toHaveLength(1);
    expect(lowerResult[0]).toEqual(upperResult[0]);
    expect(lowerResult[0]).toEqual(mixedResult[0]);
  });

  /**
   * Requirement 1.3: No matches returns empty array
   */
  test('no matches returns empty array', () => {
    const result = filterProjects(mockProjects, 'nonexistent');
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  /**
   * Requirement 1.3: Partial match on name
   */
  test('partial match on name', () => {
    const result = filterProjects(mockProjects, 'Project');
    expect(result).toHaveLength(3);
  });

  /**
   * Requirement 1.3: Partial match on ID
   */
  test('partial match on ID', () => {
    const result = filterProjects(mockProjects, 'proj');
    expect(result).toHaveLength(3);
  });

  /**
   * Edge case: Filter with whitespace (whitespace is not trimmed)
   */
  test('filter with whitespace', () => {
    // Whitespace is preserved in the filter, so it won't match
    const result = filterProjects(mockProjects, '  Alpha  ');
    expect(result).toHaveLength(0);

    // But without extra whitespace it works
    const resultNoWhitespace = filterProjects(mockProjects, 'Alpha');
    expect(resultNoWhitespace).toHaveLength(1);
    expect(resultNoWhitespace[0].name).toBe('Alpha Project');
  });

  /**
   * Edge case: Filter with special characters
   */
  test('filter with special characters', () => {
    const projectsWithSpecialChars: ProjectWithStats[] = [
      {
        id: 'proj-special-123',
        name: 'Project (Test)',
        enabled: true,
        createdAt: new Date(),
        memberCount: 1,
      },
    ];

    const result = filterProjects(projectsWithSpecialChars, '(Test)');
    expect(result).toHaveLength(1);
  });

  /**
   * Edge case: Empty projects array
   */
  test('empty projects array', () => {
    const result = filterProjects([], 'test');
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  /**
   * Edge case: Multiple matches
   */
  test('multiple matches', () => {
    const result = filterProjects(mockProjects, 'proj-');
    expect(result).toHaveLength(3);
  });

  /**
   * Requirement 1.3: Filter matches either name OR ID
   */
  test('filter matches either name or ID', () => {
    const projects: ProjectWithStats[] = [
      {
        id: 'abc-123',
        name: 'XYZ Project',
        enabled: true,
        createdAt: new Date(),
        memberCount: 1,
      },
    ];

    // Match by ID
    const resultById = filterProjects(projects, 'abc');
    expect(resultById).toHaveLength(1);

    // Match by name
    const resultByName = filterProjects(projects, 'XYZ');
    expect(resultByName).toHaveLength(1);

    // No match
    const noMatch = filterProjects(projects, 'nonexistent');
    expect(noMatch).toHaveLength(0);
  });

  /**
   * Edge case: Unicode characters
   */
  test('filter with unicode characters', () => {
    const projectsWithUnicode: ProjectWithStats[] = [
      {
        id: 'proj-unicode',
        name: 'Café Project ☕',
        enabled: true,
        createdAt: new Date(),
        memberCount: 1,
      },
    ];

    const result = filterProjects(projectsWithUnicode, 'Café');
    expect(result).toHaveLength(1);
  });

  /**
   * Requirement 1.5: Real-time filtering (filter updates immediately)
   */
  test('filter updates with each character', () => {
    // Simulate typing "Alph" character by character
    // Note: 'A' matches all projects (Alpha, Beta, Gamma all contain 'a')
    let result = filterProjects(mockProjects, 'A');
    expect(result.length).toBeGreaterThan(0);

    result = filterProjects(mockProjects, 'Al');
    expect(result).toHaveLength(1); // Only "Alpha Project"

    result = filterProjects(mockProjects, 'Alp');
    expect(result).toHaveLength(1);

    result = filterProjects(mockProjects, 'Alph');
    expect(result).toHaveLength(1);

    result = filterProjects(mockProjects, 'Alpha');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha Project');
  });
});
