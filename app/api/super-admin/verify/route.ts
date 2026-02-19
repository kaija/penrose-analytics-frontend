import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the path from query params
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    // Verify path matches environment variable
    const superAdminPath = process.env.SUPER_ADMIN_PATH;
    if (!superAdminPath || path !== superAdminPath) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user email from database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if email is in super admin allowlist
      const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      if (!superAdminEmails.includes(user.email)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ authorized: true });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
