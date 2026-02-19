/**
 * Onboarding Page
 * Guides first-time users to create their first project
 *
 * Requirements: 2.5
 */

import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  // Ensure user is authenticated
  const session = await validateSession();
  if (!session) {
    redirect('/login');
  }

  // Check if user already has projects
  const membership = await prisma.projectMembership.findFirst({
    where: { userId: session.userId },
  });

  // If user already has projects, redirect to home
  if (membership) {
    redirect('/');
  }

  // Check if user is super admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isSuperAdmin = user ? superAdminEmails.includes(user.email) : false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Prism CDP!
          </h1>
          {isSuperAdmin ? (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Let's get started by creating your first project
            </p>
          ) : (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              You don't have access to any projects yet. Please contact your administrator to grant you access.
            </p>
          )}
        </div>

        {isSuperAdmin ? (
          <>
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
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mt-8">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Only super administrators can create projects. Once an administrator grants you access to a project, you'll be able to start using Prism CDP.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You can check your project access from the <a href="/projects" className="text-red-600 hover:text-red-700 underline">projects page</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
