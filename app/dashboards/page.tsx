'use client';

import MainLayout from '@/components/MainLayout';
import { ChevronDown, MoreVertical } from 'lucide-react';

export default function DashboardsPage() {
  return (
    <MainLayout
      leftSidebar={
        <div className="p-4">
          <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors mb-4">
            + New Dashboard
          </button>
          <div className="space-y-1">
            <div className="px-3 py-2 text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md">
              My Dashboard
            </div>
            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
              Analytics Overview
            </div>
            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
              User Metrics
            </div>
          </div>
        </div>
      }
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              Save
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Widget 1 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Total Users
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last 7 days • Updated 2 hours ago
                </p>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-32 flex items-center justify-center text-gray-400 dark:text-gray-600">
              [Line Chart Placeholder]
            </div>
          </div>

          {/* Widget 2 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Event Volume
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last 30 days • Updated 1 hour ago
                </p>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-32 flex items-center justify-center text-gray-400 dark:text-gray-600">
              [Bar Chart Placeholder]
            </div>
          </div>

          {/* Widget 3 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Conversion Rate
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last 7 days • Updated 30 minutes ago
                </p>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-32 flex items-center justify-center text-gray-400 dark:text-gray-600">
              [Metric Placeholder]
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
