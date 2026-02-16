'use client';

import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

export default function ProjectStatusPage() {
  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Project Status
        </h1>

        {/* Onboarding Status Block */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Onboarding Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Project created
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Install tracking snippet
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Verify data collection
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Configure event schema
              </span>
            </div>
          </div>
        </div>

        {/* Schema Configuration Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Schema Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Define your event and user schemas to ensure consistent data collection across your application.
              </p>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
                Configure Schema
              </button>
            </div>
          </div>
        </div>

        {/* Analyze Your Data Guidance Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Analyze Your Data
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Once data is flowing, you can create dashboards and reports to visualize user behavior and track key metrics.
          </p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              Create Dashboard
            </button>
            <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-md transition-colors">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
