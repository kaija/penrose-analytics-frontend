import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';

export default async function Home() {
  // Require authentication (Requirement 2.1)
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Prism CDP + Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customer Data Platform and Analytics
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Authenticated as user: {session.userId}
        </p>
      </div>
    </div>
  );
}
