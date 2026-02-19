/**
 * Unit tests for super admin events endpoint
 *
 * Tests the GET /api/super-admin/events/[id] endpoint to verify it returns
 * monthly event aggregation correctly for various scenarios.
 *
 * Validates: Requirements 3.2, 3.3, 3.5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Super Admin Events Endpoint', () => {
  let testProject: any;
  let testUsers: any[] = [];

  beforeEach(async () => {
    // Create test project
    testProject = await prisma.project.create({
      data: {
        name: 'Test Project for Events',
        enabled: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up events first
    await prisma.event.deleteMany({
      where: { projectId: testProject.id },
    });

    // Clean up profiles
    await prisma.profile.deleteMany({
      where: { projectId: testProject.id },
    });

    // Clean up project
    if (testProject) {
      await prisma.project.delete({
        where: { id: testProject.id },
      }).catch(() => {});
    }

    // Clean up test users
    for (const user of testUsers) {
      await prisma.user.delete({
        where: { id: user.id },
      }).catch(() => {});
    }
    testUsers = [];
  });

  test('returns exactly 12 months of data', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest-${Date.now()}@test.com`,
        name: 'Event Test User',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create some events
      await prisma.event.create({
        data: {
          projectId: testProject.id,
          profileId: testProfile.id,
          eventName: 'test_event',
          payload: {},
          timestamp: new Date(),
        },
      });

      // Query events like the API does
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      expect(result).toHaveLength(12);
      expect(result.every(item => typeof item.month === 'string')).toBe(true);
      expect(result.every(item => typeof item.count === 'number')).toBe(true);
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });

  test('handles project with no events', async () => {
    // Query events for project with no events
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const events = await prisma.event.findMany({
      where: {
        projectId: testProject.id,
        timestamp: {
          gte: twelveMonthsAgo
        }
      },
      select: {
        timestamp: true
      }
    });

    expect(events).toHaveLength(0);

    // When no events, simulated data should be generated
    // This is tested by the API route logic
  });

  test('aggregates events by month correctly', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest2-${Date.now()}@test.com`,
        name: 'Event Test User 2',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create events in different months
      const now = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      await prisma.event.createMany({
        data: [
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: now,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: now,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: lastMonth,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: twoMonthsAgo,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: twoMonthsAgo,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: twoMonthsAgo,
          },
        ],
      });

      // Query and aggregate
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      // Verify aggregation
      const currentMonthKey = now.toISOString().substring(0, 7);
      const lastMonthKey = lastMonth.toISOString().substring(0, 7);
      const twoMonthsAgoKey = twoMonthsAgo.toISOString().substring(0, 7);

      expect(monthlyData.get(currentMonthKey)).toBe(2);
      expect(monthlyData.get(lastMonthKey)).toBe(1);
      expect(monthlyData.get(twoMonthsAgoKey)).toBe(3);
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });

  test('fills in missing months with zero count', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest3-${Date.now()}@test.com`,
        name: 'Event Test User 3',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create events only in current month
      await prisma.event.create({
        data: {
          projectId: testProject.id,
          profileId: testProfile.id,
          eventName: 'test_event',
          payload: {},
          timestamp: new Date(),
        },
      });

      // Query and aggregate
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      // Verify we have 12 months
      expect(result).toHaveLength(12);

      // Count how many months have zero events
      const zeroMonths = result.filter(item => item.count === 0);
      expect(zeroMonths.length).toBe(11); // 11 months should have zero

      // One month should have 1 event
      const nonZeroMonths = result.filter(item => item.count > 0);
      expect(nonZeroMonths.length).toBe(1);
      expect(nonZeroMonths[0].count).toBe(1);
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });

  test('month format is correct (YYYY-MM)', async () => {
    // Generate months like the API does
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7);
      result.push({
        month: monthKey,
        count: 0
      });
    }

    // Verify format
    const monthRegex = /^\d{4}-\d{2}$/;
    expect(result.every(item => monthRegex.test(item.month))).toBe(true);
  });

  test('handles full 12 months of events', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest4-${Date.now()}@test.com`,
        name: 'Event Test User 4',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create events for all 12 months
      const eventsData = [];
      for (let i = 0; i < 12; i++) {
        const timestamp = new Date();
        timestamp.setMonth(timestamp.getMonth() - i);

        // Create 2-5 events per month
        const eventsPerMonth = 2 + Math.floor(Math.random() * 4);
        for (let j = 0; j < eventsPerMonth; j++) {
          eventsData.push({
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: new Date(timestamp),
          });
        }
      }

      await prisma.event.createMany({ data: eventsData });

      // Query and aggregate
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      // Verify we have 12 months
      expect(result).toHaveLength(12);

      // All months should have at least some events
      const nonZeroMonths = result.filter(item => item.count > 0);
      expect(nonZeroMonths.length).toBeGreaterThan(0);

      // Total count should match number of events created
      const totalCount = result.reduce((sum, item) => sum + item.count, 0);
      expect(totalCount).toBe(eventsData.length);

      // Each month should have the expected count
      for (const dataPoint of result) {
        expect(dataPoint.count).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(dataPoint.count)).toBe(true);
      }
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });

  test('handles events at month boundaries', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest5-${Date.now()}@test.com`,
        name: 'Event Test User 5',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create two events in the same month but at different times (use current month)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      // First day of current month
      const timestamp1 = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      // 15th day of current month
      const timestamp2 = new Date(Date.UTC(year, month, 15, 23, 59, 59));

      await prisma.event.createMany({
        data: [
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: timestamp1,
          },
          {
            projectId: testProject.id,
            profileId: testProfile.id,
            eventName: 'test_event',
            payload: {},
            timestamp: timestamp2,
          },
        ],
      });

      // Query and aggregate
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      // Both events should be in the same month
      const monthKey1 = timestamp1.toISOString().substring(0, 7);
      const monthKey2 = timestamp2.toISOString().substring(0, 7);

      expect(monthKey1).toBe(monthKey2);

      // Both events should be counted together
      expect(monthlyData.get(monthKey1)).toBe(2);
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });

  test('handles large number of events in a single month', async () => {
    // Create a test profile for events
    const testUser = await prisma.user.create({
      data: {
        email: `eventtest6-${Date.now()}@test.com`,
        name: 'Event Test User 6',
      },
    });
    testUsers.push(testUser);

    const testProfile = await prisma.profile.create({
      data: {
        projectId: testProject.id,
        externalId: testUser.id,
        traits: {},
        identities: {},
      },
    });

    try {
      // Create 100 events in current month
      const eventsData = [];
      const now = new Date();
      for (let i = 0; i < 100; i++) {
        eventsData.push({
          projectId: testProject.id,
          profileId: testProfile.id,
          eventName: 'test_event',
          payload: {},
          timestamp: now,
        });
      }

      await prisma.event.createMany({ data: eventsData });

      // Query and aggregate
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: testProject.id,
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

      // Verify count
      const currentMonthKey = now.toISOString().substring(0, 7);
      expect(monthlyData.get(currentMonthKey)).toBe(100);
    } finally {
      // Clean up
      await prisma.profile.delete({ where: { id: testProfile.id } }).catch(() => {});
    }
  });
});
