import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { getUserRole } from '@/lib/project';
import IdHierarchyWrapper from './IdHierarchyWrapper';

export default async function IdHierarchyPage() {
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

  return <IdHierarchyWrapper projectId={session.activeProjectId} userRole={role} />;
}
