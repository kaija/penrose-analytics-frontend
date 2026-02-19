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

      // Get all users with memberships
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
          memberships: {
            select: {
              projectId: true,
              role: true,
              createdAt: true,
              project: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Transform to match UserWithMemberships interface
      const usersWithMemberships = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        memberships: user.memberships.map(m => ({
          projectId: m.projectId,
          projectName: m.project.name,
          role: m.role,
          createdAt: m.createdAt,
        })),
      }));

      return NextResponse.json(usersWithMemberships);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
