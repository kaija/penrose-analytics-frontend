import { NextRequest, NextResponse } from 'next/server';
import { validateSession, createAccessSimulationSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

/**
 * POST /api/super-admin/access-project
 *
 * Creates an access simulation session for a super admin to access a project as owner.
 *
 * Requirements: 2.1, 2.2, 2.5
 */
export async function POST(request: NextRequest) {
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

      // Parse request body
      const body = await request.json();
      const { projectId } = body;

      if (!projectId || typeof projectId !== 'string') {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Create audit log entry for access simulation start
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          projectId: projectId,
          action: 'super_admin.access_simulation.start' as any,
          details: {
            type: 'super_admin_access_simulation',
            projectId: projectId,
            projectName: project.name,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Create access simulation session
      await createAccessSimulationSession(session.userId, projectId);

      // Return redirect URL to project dashboard
      // The dashboards page will use the activeProjectId from the session
      const redirectUrl = `/dashboards`;

      return NextResponse.json({
        redirectUrl,
        projectId,
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Access simulation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
