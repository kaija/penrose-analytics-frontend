import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import SegmentCreateClient from './SegmentCreateClient';

export default async function SegmentNewPage() {
  const session = await validateSession();
  if (!session) redirect('/login');
  if (!session.activeProjectId) redirect('/projects');
  return <SegmentCreateClient projectId={session.activeProjectId} />;
}
