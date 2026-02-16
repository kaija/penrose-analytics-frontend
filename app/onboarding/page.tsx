/**
 * Onboarding Page
 * Guides first-time users to create their first project
 * 
 * Requirements: 2.5
 */

import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  // Ensure user is authenticated
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Prism CDP!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Let's get started by creating your first project
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Create Your First Project
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Projects help you organize customer data for different products or
            organizations. You can create multiple projects and invite team members
            to collaborate.
          </p>

          <OnboardingForm />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          You can create more projects later from the project switcher
        </p>
      </div>
    </div>
  );
}
