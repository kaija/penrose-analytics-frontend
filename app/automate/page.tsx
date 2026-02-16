'use client';

import MainLayout from '@/components/MainLayout';
import { Zap } from 'lucide-react';

export default function AutomatePage() {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Automate
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Coming soon
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Automation features will allow you to trigger actions based on customer behavior and events.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
