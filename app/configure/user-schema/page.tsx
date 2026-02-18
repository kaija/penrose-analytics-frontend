import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import UserSchemaClient from './UserSchemaClient';

export default async function UserSchemaPage() {
  const session = await validateSession();
  if (!session) redirect('/login');
  if (!session.activeProjectId) redirect('/projects');
  return <UserSchemaClient projectId={session.activeProjectId} />;
}
