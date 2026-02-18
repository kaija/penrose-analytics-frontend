import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import SegmentEditClient from './SegmentEditClient';

export default async function SegmentEditPage({ params }: { params: Promise<{ segmentId: string }> }) {
  const session = await validateSession();
  if (!session) redirect('/login');
  if (!session.activeProjectId) redirect('/projects');
  const { segmentId } = await params;
  return <SegmentEditClient projectId={session.activeProjectId} segmentId={segmentId} />;
}
