import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import SegmentsClient from './SegmentsClient';

export default async function SegmentsPage() {
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.activeProjectId) {
    redirect('/projects');
  }

  return <SegmentsClient projectId={session.activeProjectId} />;
}
