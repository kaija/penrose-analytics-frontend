/**
 * Unit tests for /readyz readiness probe endpoint
 *
 * Requirements: 1.9, 1.11
 */

import { GET } from '@/app/readyz/route';
import { prisma } from '@/lib/prisma';

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('GET /readyz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return HTTP 200 when database is connected', async () => {
    // Mock successful database query
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return healthy status when database is connected', async () => {
    // Mock successful database query
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.healthy).toBe(true);
  });

  it('should include database check with ok status when connected', async () => {
    // Mock successful database query
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks).toHaveLength(1);
    expect(data.checks[0]).toEqual({
      name: 'database',
      status: 'ok',
    });
  });

  it('should return HTTP 503 when database is unavailable', async () => {
    // Mock database connection failure
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('Connection refused')
    );

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it('should return unhealthy status when database is unavailable', async () => {
    // Mock database connection failure
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('Connection refused')
    );

    const response = await GET();
    const data = await response.json();

    expect(data.healthy).toBe(false);
  });

  it('should include database check with error status when unavailable', async () => {
    // Mock database connection failure
    const errorMessage = 'Connection refused';
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    const response = await GET();
    const data = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks).toHaveLength(1);
    expect(data.checks[0]).toEqual({
      name: 'database',
      status: 'error',
      message: errorMessage,
    });
  });
});
