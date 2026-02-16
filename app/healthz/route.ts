import { NextResponse } from 'next/server';

/**
 * Liveness probe endpoint for Kubernetes
 * Returns HTTP 200 if the application process is running
 * 
 * Requirements: 1.8, 1.10
 */
export async function GET() {
  return NextResponse.json(
    {
      healthy: true,
      checks: [
        {
          name: 'application',
          status: 'ok',
        },
      ],
    },
    { status: 200 }
  );
}
