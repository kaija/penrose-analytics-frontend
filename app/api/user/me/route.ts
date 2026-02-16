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

    // Transform projects data
    const projects = user.memberships.map((m) => m.project);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      projects,
      activeProjectId: session.activeProjectId,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
