import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import ProjectHistoryClient from './ProjectHistoryClient';

export default async function ProjectHistoryPage() {
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.activeProjectId) {
    redirect('/projects');
  }

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Project History
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View audit logs and track all activities in your project
        </p>
      </div>

      <ProjectHistoryClient projectId={session.activeProjectId} />
    </MainLayout>
  );
}
