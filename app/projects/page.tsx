/**
 * Projects Page
 * Displays user's projects and provides project creation functionality
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.12
 */

import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { getUserProjects } from '@/lib/project';
import ProjectsWrapper from './ProjectsWrapper';

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
    <ProjectsWrapper
      projects={projects}
      activeProjectId={session.activeProjectId}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
