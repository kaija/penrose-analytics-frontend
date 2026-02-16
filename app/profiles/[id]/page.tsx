'use client';

import MainLayout from '@/components/MainLayout';
import { ArrowLeft, Mail, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

export default function ProfileDetailPage({ params }: { params: { id: string } }) {
  return (
    <MainLayout>
      <div>
        {/* Back button */}
        <Link
          href="/profiles"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profiles
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Profile: {params.id}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Traits */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Profile Traits
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">john@example.com</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">John Doe</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Plan</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Premium</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">First Seen</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Jan 15, 2024</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Seen</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">2 hours ago</p>
                </div>
              </div>
            </div>

            {/* ID Hierarchy */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ID Hierarchy
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">user_12345</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anonymous ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">anon_abc123</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">device_xyz789</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Event Timeline
              </h2>
              <div className="space-y-4">
                {/* Event 1 */}
                <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Page Viewed
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        2 hours ago
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      /dashboard
                    </p>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Button Clicked
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        3 hours ago
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create Report
                    </p>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Email Opened
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        1 day ago
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Weekly Report
                    </p>
                  </div>
                </div>

                {/* Event 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Account Created
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Jan 15, 2024
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      User signed up
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
