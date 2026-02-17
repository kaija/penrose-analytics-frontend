import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import ProjectStatusWrapper from './ProjectStatusWrapper';

export default async function ProjectStatusPage() {
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.activeProjectId) {
    redirect('/projects');
  }

  const role = await getUserRole(session.userId, session.activeProjectId);
  if (!role) {
    redirect('/projects');
  }

  return <ProjectStatusWrapper projectId={session.activeProjectId} />;
}
