import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

export async function GET() {
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

      // Get all memberships with user and project details
      const memberships = await prisma.projectMembership.findMany({
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(memberships);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
