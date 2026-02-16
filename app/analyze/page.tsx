'use client';

import MainLayout from '@/components/MainLayout';
import { Grid, List, Star, Clock, Tag } from 'lucide-react';

export default function AnalyzePage() {
  return (
    <MainLayout
      leftSidebar={
        <div className="p-4">
          <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors mb-4">
            + New Report
          </button>
          
          {/* Organization sections */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Organization
            </h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                <Star className="w-4 h-4" />
                Favorites
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                <Clock className="w-4 h-4" />
                Subscriptions
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                <Tag className="w-4 h-4" />
                My Reports
              </div>
            </div>
          </div>

          {/* Report categories */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Categories
            </h3>
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Trends
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Journeys
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Attribution
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Cohorts
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Retention
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                My Tags
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Groups
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Recently Accessed
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            All Analytics Reports
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <Grid className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Report card 1 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mb-3">
              <div className="w-6 h-6 text-red-600 dark:text-red-400">📊</div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              User Trends
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated 2 hours ago
            </p>
          </div>

          {/* Report card 2 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mb-3">
              <div className="w-6 h-6 text-red-600 dark:text-red-400">🔄</div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Conversion Funnel
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated 5 hours ago
            </p>
          </div>

          {/* Report card 3 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mb-3">
              <div className="w-6 h-6 text-red-600 dark:text-red-400">📈</div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Retention Analysis
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated 1 day ago
            </p>
          </div>

          {/* Report card 4 */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mb-3">
              <div className="w-6 h-6 text-red-600 dark:text-red-400">🎯</div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Attribution Report
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated 3 days ago
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
