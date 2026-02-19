'use client';

/**
 * Invitation Modal Component
 * Handles sending and managing project invitations
 *
 * Requirements: 5.1, 5.4, 5.10
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, RefreshCw } from '@/components/icons';

interface Invitation {
  id: string;
  invitedEmail: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}

interface InvitationModalProps {
  projectId: string;
  onClose: () => void;
}

export default function InvitationModal({ projectId, onClose }: InvitationModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Load pending invitations
  useEffect(() => {
    loadPendingInvitations();
  }, [projectId]);

  const loadPendingInvitations = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        // Filter for pending invitations only
        const pending = (data.data || []).filter(
          (inv: Invitation) => !inv.acceptedAt && new Date(inv.expiresAt) > new Date()
        );
        setPendingInvitations(pending);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitedEmail: email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error || 'Failed to send invitation';
        throw new Error(errorMessage);
      }

      // Success!
      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
      setRole('viewer');

      // Reload pending invitations
      await loadPendingInvitations();

      // Refresh the parent page to show updated member list
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error || 'Failed to resend invitation';
        throw new Error(errorMessage);
      }

      setSuccess('Invitation resent successfully');
      await loadPendingInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invite Team Member
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invitation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="viewer">Viewer - Read-only access</option>
                <option value="editor">Editor - Can create and edit</option>
                <option value="admin">Admin - Can manage members</option>
                <option value="owner">Owner - Full control</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="w-5 h-5" />
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>

          {/* Pending Invitations */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Invitations
            </h3>

            {loadingInvitations ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            ) : pendingInvitations.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No pending invitations
              </p>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invitation.invitedEmail}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Role: <span className="capitalize">{invitation.role}</span> •
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResend(invitation.id)}
                      disabled={resendingId === invitation.id}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      title="Resend invitation"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
