'use client';

/**
 * Invitation Accept Form Component
 * Client component that handles the invitation acceptance submission
 *
 * Requirements: 5.7, 5.8
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface InvitationAcceptFormProps {
  token: string;
  projectName: string;
  role: string;
  invitedEmail: string;
}

export default function InvitationAcceptForm({
  token,
  projectName,
  role,
  invitedEmail,
}: InvitationAcceptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error || 'Failed to accept invitation';
        throw new Error(errorMessage);
      }

      // Switch to the new project
      const switchResponse = await fetch(`/api/projects/${data.data.project.id}/switch`, {
        method: 'POST',
      });

      if (!switchResponse.ok) {
        throw new Error('Failed to switch to project');
      }

      // Success! Redirect to home
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Accept Invitation
      </h1>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Project</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {projectName}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
          <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
            {role}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
          <p className="text-base font-medium text-gray-900 dark:text-white">
            {invitedEmail}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Accepting...' : 'Accept Invitation'}
        </button>
        <a
          href="/login"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
