import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/me
 * Get current user information with their projects
 */
export async function GET() {
  try {
    // Validate session
    const session = await validateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with their project memberships
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        memberships: {
          select: {
            project: {
              select: {
                id: true,
                name: true,
                enabled: true,
              },
            },
          },
          where: {
            project: {
              enabled: true,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure user has a name (fallback to email username if not)
    const userName = user.name || user.email.split('@')[0];

    // Transform projects data
    const projects = user.memberships.map((m) => m.project);

    // Check if user is super admin
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isSuperAdmin = superAdminEmails.includes(user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        avatar: user.avatar,
      },
      projects,
      activeProjectId: session.activeProjectId,
      isSuperAdmin,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
