import { NextRequest, NextResponse } from 'next/server';
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

      // Get all projects with member counts
      const projects = await prisma.project.findMany({
        include: {
          _count: {
            select: { memberships: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform to ProjectWithStats format
      const projectsWithStats = projects.map(p => ({
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        createdAt: p.createdAt,
        memberCount: p._count.memberships
      }));

      return NextResponse.json(projectsWithStats);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      const { name } = body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
      }

      if (name.length > 100) {
        return NextResponse.json({ error: 'Project name must be less than 100 characters' }, { status: 400 });
      }

      // Create project and assign super admin as owner
      const project = await prisma.$transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: {
            name: name.trim(),
            enabled: true,
          },
        });

        // Create owner membership for the super admin
        await tx.projectMembership.create({
          data: {
            userId: session.userId,
            projectId: newProject.id,
            role: 'owner',
          },
        });

        return newProject;
      });

      return NextResponse.json(project, { status: 201 });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Super admin create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
