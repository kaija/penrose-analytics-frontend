'use client';

import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { Settings, Zap, Navigation, Lock } from 'lucide-react';
import { DEFAULT_EVENT_PROPERTIES, DEFAULT_EVENT_PROPERTIES_BY_CATEGORY } from '@/lib/constants/default-event-properties';
import { DEFAULT_VISIT_PROPERTIES, DEFAULT_VISIT_PROPERTIES_BY_CATEGORY } from '@/lib/constants/default-visit-properties';

interface SystemPropertiesClientProps {
  projectId: string;
}

type PropertyType = 'event' | 'visit';

export default function SystemPropertiesClient({ projectId }: SystemPropertiesClientProps) {
  const [activeTab, setActiveTab] = useState<PropertyType>('event');

  const categoryLabels = {
    // Event categories
    metadata: '元資料',
    campaign: '行銷活動',
    technical: '技術資訊',
    behavioral: '行為資訊',
    // Visit categories
    location: '地理位置',
    device: '裝置資訊',
    time: '時間資訊',
    referrer: '來源資訊',
    behavior: '行為資訊',
  };

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Properties</h1>
          </div>
        </div>

        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          系統預設屬性可用於 Segment 篩選與報表分析。這些屬性由系統自動收集，無法修改或刪除。
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('event')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'event'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            Event Properties ({DEFAULT_EVENT_PROPERTIES.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visit')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visit'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Visit Properties ({DEFAULT_VISIT_PROPERTIES.length})
          </button>
        </div>

        {/* Event Properties */}
        {activeTab === 'event' && (
          <div className="space-y-6">
            {Object.entries(DEFAULT_EVENT_PROPERTIES_BY_CATEGORY).map(([category, properties]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h2>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">型別</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {properties.map(prop => (
                        <tr key={prop.field} className="bg-gray-50/50 dark:bg-gray-800/30">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{prop.field}</code>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{prop.displayName}</td>
                          <td className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500">{prop.description}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">{prop.dataType}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visit Properties */}
        {activeTab === 'visit' && (
          <div className="space-y-6">
            {Object.entries(DEFAULT_VISIT_PROPERTIES_BY_CATEGORY).map(([category, properties]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h2>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">型別</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {properties.map(prop => (
                        <tr key={prop.field} className="bg-gray-50/50 dark:bg-gray-800/30">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{prop.field}</code>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{prop.displayName}</td>
                          <td className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500">{prop.description}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">{prop.dataType}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
