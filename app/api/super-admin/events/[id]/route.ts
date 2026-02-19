import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

interface MonthlyEventData {
  month: string; // Format: "2024-01"
  count: number;
}

interface EventUsageResponse {
  projectId: string;
  data: MonthlyEventData[];
  isSimulated: boolean;
}

/**
 * Generate simulated event data for demonstration purposes
 * Creates realistic variation around a base count
 */
function generateSimulatedEventData(): MonthlyEventData[] {
  const result: MonthlyEventData[] = [];
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

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateSession();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = new PrismaClient();

    try {
      // Verify super admin access
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      if (!superAdminEmails.includes(user.email)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const { id: projectId } = await params;

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Get events for past 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const events = await prisma.event.findMany({
        where: {
          projectId: projectId,
          timestamp: {
            gte: twelveMonthsAgo
          }
        },
        select: {
          timestamp: true
        }
      });

      // Check if we have any events
      if (events.length === 0) {
        // Generate simulated data
        const simulatedData = generateSimulatedEventData();
        const response: EventUsageResponse = {
          projectId,
          data: simulatedData,
          isSimulated: true
        };
        return NextResponse.json(response);
      }

      // Aggregate by month
      const monthlyData: Map<string, number> = new Map();
      events.forEach(event => {
        const monthKey = event.timestamp.toISOString().substring(0, 7); // "2024-01"
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      });

      // Fill in all 12 months (including months with zero events)
      const result: MonthlyEventData[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7);
        result.push({
          month: monthKey,
          count: monthlyData.get(monthKey) || 0
        });
      }

      const response: EventUsageResponse = {
        projectId,
        data: result,
        isSimulated: false
      };

      return NextResponse.json(response);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
