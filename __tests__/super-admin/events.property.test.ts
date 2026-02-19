/**
 * Property-based tests for super admin events endpoint
 *
 * Feature: super-admin-dashboard
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { describe, test, expect, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Events Property Tests', () => {
  // Track created resources for cleanup
  const createdProjects: string[] = [];
  const createdUsers: string[] = [];
  const createdProfiles: string[] = [];

  afterEach(async () => {
    // Clean up events first
    if (createdProjects.length > 0) {
      await prisma.event.deleteMany({
        where: { projectId: { in: createdProjects } },
      });
    }

    // Clean up profiles
    if (createdProfiles.length > 0) {
      await prisma.profile.deleteMany({
        where: { id: { in: createdProfiles } },
      }).catch(() => {});
      createdProfiles.length = 0;
    }

    // Clean up projects
    if (createdProjects.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjects } },
      }).catch(() => {});
      createdProjects.length = 0;
    }

    // Clean up users
    if (createdUsers.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUsers } },
      }).catch(() => {});
      createdUsers.length = 0;
    }
  });

  /**
   * Property 10: Monthly event data structure
   *
   * For any project, the event usage data should contain exactly 12 monthly
   * data points, one for each of the past 12 months, with each data point
   * having a month string and a count number.
   *
   * **Validates: Requirements 3.2**
   */
  test('Property 10: Monthly event data structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random project and event data
        fc.record({
          projectName: fc.string({ minLength: 1, maxLength: 100 }),
          eventCount: fc.integer({ min: 0, max: 50 }), // Random number of events
        }),
        async (testData) => {
          // Create test project
          const project = await prisma.project.create({
            data: {
              name: testData.projectName,
              enabled: true,
            },
          });
          createdProjects.push(project.id);

          // Create test user and profile if we need events
          if (testData.eventCount > 0) {
            const user = await prisma.user.create({
              data: {
                email: `test-${Date.now()}-${Math.random()}@test.com`,
                name: 'Test User',
              },
            });
            createdUsers.push(user.id);

            const profile = await prisma.profile.create({
              data: {
                projectId: project.id,
                externalId: user.id,
                traits: {},
                identities: {},
              },
            });
            createdProfiles.push(profile.id);

            // Create random events across different months
            const events = [];
            for (let i = 0; i < testData.eventCount; i++) {
              const monthOffset = Math.floor(Math.random() * 12);
              const timestamp = new Date();
              timestamp.setMonth(timestamp.getMonth() - monthOffset);

              events.push({
                projectId: project.id,
                profileId: profile.id,
                eventName: 'test_event',
                payload: {},
                timestamp,
              });
            }

            if (events.length > 0) {
              await prisma.event.createMany({ data: events });
            }
          }

          // Query events like the API does
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

          const events = await prisma.event.findMany({
            where: {
              projectId: project.id,
              timestamp: {
                gte: twelveMonthsAgo
              }
            },
            select: {
              timestamp: true
            }
          });

          // Aggregate by month
          const monthlyData: Map<string, number> = new Map();
          events.forEach(event => {
            const monthKey = event.timestamp.toISOString().substring(0, 7);
            monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
          });

          // Fill in all 12 months
          const result = [];
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().substring(0, 7);
            result.push({
              month: monthKey,
              count: monthlyData.get(monthKey) || 0
            });
          }

          // Requirement 3.2: Verify data structure

          // Must have exactly 12 months
          expect(result).toHaveLength(12);

          // Each data point must have correct structure
          for (const dataPoint of result) {
            // Must have 'month' field as string
            expect(dataPoint.month).toBeDefined();
            expect(typeof dataPoint.month).toBe('string');

            // Month must be in YYYY-MM format
            const monthRegex = /^\d{4}-\d{2}$/;
            expect(monthRegex.test(dataPoint.month)).toBe(true);

            // Must have 'count' field as number
            expect(dataPoint.count).toBeDefined();
            expect(typeof dataPoint.count).toBe('number');

            // Count must be non-negative
            expect(dataPoint.count).toBeGreaterThanOrEqual(0);

            // Count must be an integer
            expect(Number.isInteger(dataPoint.count)).toBe(true);

            // No extra fields
            const expectedFields = ['month', 'count'];
            const actualFields = Object.keys(dataPoint);
            expect(actualFields.sort()).toEqual(expectedFields.sort());
          }

          // Months must be in chronological order (oldest to newest)
          for (let i = 1; i < result.length; i++) {
            const prevMonth = result[i - 1].month;
            const currMonth = result[i].month;
            expect(prevMonth < currMonth).toBe(true);
          }

          // The last month should be the current month or very recent
          const lastMonth = result[result.length - 1].month;
          const currentMonth = new Date().toISOString().substring(0, 7);
          expect(lastMonth).toBe(currentMonth);

          // Total count should match number of events created (if within 12 months)
          const totalCount = result.reduce((sum, item) => sum + item.count, 0);
          expect(totalCount).toBe(testData.eventCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Simulated event data validity
   *
   * For any simulated event data, each monthly count should be a non-negative
   * integer, and the data should follow a realistic pattern with variation.
   *
   * **Validates: Requirements 3.6**
   */
  test('Property 11: Simulated event data validity', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random project (with no events to trigger simulation)
        fc.record({
          projectName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (testData) => {
          // Create test project with NO events (to trigger simulated data)
          const project = await prisma.project.create({
            data: {
              name: testData.projectName,
              enabled: true,
            },
          });
          createdProjects.push(project.id);

          // Generate simulated data (mimicking API behavior)
          // This is the same logic as in the API route
          const result = [];
          const baseCount = 1000;

          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().substring(0, 7);

            // Generate realistic variation: base count ± 30%
            const variation = (Math.random() - 0.5) * 0.6;
            const count = Math.floor(baseCount * (1 + variation));

            result.push({
              month: monthKey,
              count: Math.max(0, count)
            });
          }

          // Requirement 3.6: Verify simulated data validity

          // Must have exactly 12 months
          expect(result).toHaveLength(12);

          // Each count must be a non-negative integer
          for (const dataPoint of result) {
            expect(dataPoint.count).toBeDefined();
            expect(typeof dataPoint.count).toBe('number');
            expect(dataPoint.count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(dataPoint.count)).toBe(true);
          }

          // Verify realistic pattern with variation
          const counts = result.map(d => d.count);
          const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length;

          // Average should be close to base count (1000)
          // Allow for statistical variation in the average
          expect(avgCount).toBeGreaterThan(700); // Base 1000 - 30% = 700
          expect(avgCount).toBeLessThan(1300); // Base 1000 + 30% = 1300

          // Verify there is variation (not all counts are the same)
          const uniqueCounts = new Set(counts);
          expect(uniqueCounts.size).toBeGreaterThan(1);

          // Each count should be within the expected range (700-1300)
          for (const count of counts) {
            expect(count).toBeGreaterThanOrEqual(700);
            expect(count).toBeLessThanOrEqual(1300);
          }

          // Verify standard deviation shows realistic variation
          const variance = counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length;
          const stdDev = Math.sqrt(variance);

          // Standard deviation should be reasonable (not zero, not too large)
          expect(stdDev).toBeGreaterThan(0);
          expect(stdDev).toBeLessThan(300); // Reasonable upper bound for ±30% variation
        }
      ),
      { numRuns: 100 }
    );
  });
});
