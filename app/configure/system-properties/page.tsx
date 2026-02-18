import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import SystemPropertiesClient from './SystemPropertiesClient';

export default async function SystemPropertiesPage() {
  const session = await validateSession();
  if (!session) redirect('/login');
  if (!session.activeProjectId) redirect('/projects');
  return <SystemPropertiesClient projectId={session.activeProjectId} />;
}
