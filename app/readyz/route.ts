import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Readiness probe endpoint for Kubernetes
 * Returns HTTP 200 if the database connection is healthy
 * 
 * Requirements: 1.9, 1.11
 */
export async function GET() {
  try {
    // Check database connectivity by executing a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      {
        healthy: true,
        checks: [
          {
            name: 'database',
            status: 'ok',
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    // Database is not reachable
    return NextResponse.json(
      {
        healthy: false,
        checks: [
          {
            name: 'database',
            status: 'error',
            message: error instanceof Error ? error.message : 'Database connection failed',
          },
        ],
      },
      { status: 503 }
    );
  }
}
