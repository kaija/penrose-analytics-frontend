'use client';

import { ReactNode } from 'react';
import TopNavigation from './TopNavigation';
import { ThemeProvider } from './ThemeProvider';
import { UserProvider } from '@/contexts/UserContext';

interface MainLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
}

export default function MainLayout({ children, leftSidebar }: MainLayoutProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <div className="min-h-screen bg-white dark:bg-black">
          <TopNavigation />
          <div className="flex">
            {leftSidebar && (
              <aside className="w-64 border-r border-gray-200 dark:border-gray-800 min-h-[calc(100vh-64px)]">
                {leftSidebar}
              </aside>
            )}
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
