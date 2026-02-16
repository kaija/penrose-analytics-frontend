'use client';

import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from './ConfigureSidebar';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
