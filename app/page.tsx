import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';

export default async function Home() {
  // Require authentication (Requirement 2.1)
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  // Redirect authenticated users to dashboards page
  redirect('/dashboards');
}
