'use client';

import MainLayout from '@/components/MainLayout';
import { TrendingUp, GitBranch, Users } from 'lucide-react';

export default function AnalyzePage() {
  return (
    <MainLayout
      leftSidebar={
        <div className="p-4">
          <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors mb-4">
            + New Report
          </button>

          {/* Report categories */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Reports
            </h3>
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Trend
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Sankey
              </div>
              <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                Retention
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Analytics Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a report type to analyze your data and gain insights
          </p>
        </div>

        {/* Report cards with illustrations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Report */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-950 rounded-lg mb-4 group-hover:bg-red-200 dark:group-hover:bg-red-900 transition-colors">
              <TrendingUp className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Illustration */}
            <div className="mb-4 h-32 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <svg className="w-full h-full p-4" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 90 L50 60 L90 70 L130 30 L170 40" stroke="currentColor" strokeWidth="3" className="text-red-600 dark:text-red-400" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="10" cy="90" r="4" fill="currentColor" className="text-red-600 dark:text-red-400"/>
                <circle cx="50" cy="60" r="4" fill="currentColor" className="text-red-600 dark:text-red-400"/>
                <circle cx="90" cy="70" r="4" fill="currentColor" className="text-red-600 dark:text-red-400"/>
                <circle cx="130" cy="30" r="4" fill="currentColor" className="text-red-600 dark:text-red-400"/>
                <circle cx="170" cy="40" r="4" fill="currentColor" className="text-red-600 dark:text-red-400"/>
                <line x1="10" y1="95" x2="190" y2="95" stroke="currentColor" strokeWidth="1" className="text-gray-300 dark:text-gray-600"/>
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Trend Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Visualize how metrics change over time. Track user behavior, event counts, and custom properties with flexible time ranges and segmentation.
            </p>
          </div>

          {/* Sankey Report */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-center w-16 h-16 bg-cyan-100 dark:bg-cyan-950 rounded-lg mb-4 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900 transition-colors">
              <GitBranch className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>

            {/* Illustration */}
            <div className="mb-4 h-32 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <svg className="w-full h-full p-4" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Flow paths */}
                <path d="M20 20 Q60 20 60 35" stroke="currentColor" strokeWidth="8" className="text-cyan-600 dark:text-cyan-400" opacity="0.6" strokeLinecap="round"/>
                <path d="M20 50 Q60 50 60 50" stroke="currentColor" strokeWidth="12" className="text-cyan-600 dark:text-cyan-400" opacity="0.7" strokeLinecap="round"/>
                <path d="M20 80 Q60 80 60 65" stroke="currentColor" strokeWidth="6" className="text-cyan-600 dark:text-cyan-400" opacity="0.5" strokeLinecap="round"/>

                <path d="M100 35 Q140 35 140 30" stroke="currentColor" strokeWidth="6" className="text-cyan-600 dark:text-cyan-400" opacity="0.6" strokeLinecap="round"/>
                <path d="M100 50 Q140 50 140 50" stroke="currentColor" strokeWidth="10" className="text-cyan-600 dark:text-cyan-400" opacity="0.7" strokeLinecap="round"/>
                <path d="M100 65 Q140 65 140 70" stroke="currentColor" strokeWidth="8" className="text-cyan-600 dark:text-cyan-400" opacity="0.5" strokeLinecap="round"/>

                {/* Nodes */}
                <rect x="10" y="10" width="10" height="80" rx="2" fill="currentColor" className="text-gray-400 dark:text-gray-600"/>
                <rect x="60" y="25" width="40" height="50" rx="2" fill="currentColor" className="text-gray-400 dark:text-gray-600"/>
                <rect x="140" y="20" width="40" height="60" rx="2" fill="currentColor" className="text-gray-400 dark:text-gray-600"/>
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Sankey Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Understand user journeys and flow patterns. Visualize how users navigate through events, pages, or states with proportional flow diagrams.
            </p>
          </div>

          {/* Retention Report */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-950 rounded-lg mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-900 transition-colors">
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            {/* Illustration */}
            <div className="mb-4 h-32 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <svg className="w-full h-full p-4" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cohort grid */}
                <rect x="20" y="20" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="1"/>
                <rect x="55" y="20" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.8"/>
                <rect x="90" y="20" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.6"/>
                <rect x="125" y="20" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.4"/>
                <rect x="160" y="20" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.2"/>

                <rect x="20" y="40" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="1"/>
                <rect x="55" y="40" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.7"/>
                <rect x="90" y="40" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.5"/>
                <rect x="125" y="40" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.3"/>

                <rect x="20" y="60" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="1"/>
                <rect x="55" y="60" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.75"/>
                <rect x="90" y="60" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.5"/>

                <rect x="20" y="80" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="1"/>
                <rect x="55" y="80" width="30" height="15" rx="2" fill="currentColor" className="text-green-600 dark:text-green-400" opacity="0.8"/>
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Retention Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Measure user retention over time. Analyze cohorts to understand how many users return after their first interaction and identify retention patterns.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
