/**
 * Team Members Page (Configure > Users)
 * Displays project members and allows management
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4
 */

import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { getUserRole, getProjectMembers } from '@/lib/project';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '@/app/configure/ConfigureSidebar';
import TeamMembersList from '@/app/configure/users/TeamMembersList';

export default async function TeamMembersPage() {
  // Validate session
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  // Check if user has an active project
  if (!session.activeProjectId) {
    redirect('/projects');
  }

  // Get user's role in the project
  const role = await getUserRole(session.userId, session.activeProjectId);
  if (!role) {
    redirect('/projects');
  }

  // Only owners and admins can view members
  if (role !== 'owner' && role !== 'admin') {
    return (
      <MainLayout leftSidebar={<ConfigureSidebar />}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Only owners and admins can view team members.
          </p>
        </div>
      </MainLayout>
    );
  }

  // Get project members
  const members = await getProjectMembers(session.activeProjectId);

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Team Members
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your project team members and their roles
        </p>
      </div>

      <TeamMembersList
        members={members}
        currentUserId={session.userId}
        currentUserRole={role}
        projectId={session.activeProjectId}
      />
    </MainLayout>
  );
}
