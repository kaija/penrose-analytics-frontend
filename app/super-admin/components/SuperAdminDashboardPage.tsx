import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import SuperAdminDashboardClient from './SuperAdminDashboardClient';
import { ProjectWithStats } from './ProjectListSection';
import { UserWithMemberships } from './UserListSection';

async function getSuperAdminData() {
  const session = await validateSession();

  if (!session?.userId) {
    redirect('/login');
  }

  const prisma = new PrismaClient();

  try {
    // Verify super admin access
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    if (!user) {
      return null;
    }

    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (!superAdminEmails.includes(user.email)) {
      return null;
    }

    // Fetch projects with member counts
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { memberships: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectsWithStats: ProjectWithStats[] = projects.map(p => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      createdAt: p.createdAt,
      memberCount: p._count.memberships
    }));

    // Fetch users with memberships
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

    const usersWithMemberships: UserWithMemberships[] = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      memberships: user.memberships.map(m => ({
        projectId: m.projectId,
        projectName: m.project.name,
        role: m.role as 'owner' | 'admin' | 'editor' | 'viewer',
        createdAt: m.createdAt,
      })),
    }));

    return {
      projects: projectsWithStats,
      users: usersWithMemberships,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export default async function SuperAdminDashboardPage() {
  const data = await getSuperAdminData();

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminDashboardClient
      initialProjects={data.projects}
      initialUsers={data.users}
    />
  );
}
