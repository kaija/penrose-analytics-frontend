/**
 * Projects Page
 * Displays user's projects and provides project creation functionality
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.12
 */

import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { getUserProjects } from '@/lib/project';
import ProjectList from './ProjectList';

export default async function ProjectsPage() {
  // Validate session
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  // Get user's projects
  const projects = await getUserProjects(session.userId);

  // Check if user is super admin
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isSuperAdmin = user ? superAdminEmails.includes(user.email) : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your projects and create new ones
          </p>
        </div>

        <ProjectList 
          projects={projects} 
          activeProjectId={session.activeProjectId}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
