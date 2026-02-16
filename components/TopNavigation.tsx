'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import ProjectSwitcher from './ProjectSwitcher';
import { Bell } from './icons';

const navigationTabs = [
  { name: 'Dashboards', href: '/dashboards' },
  { name: 'Activity', href: '/activity' },
  { name: 'Profiles', href: '/profiles' },
  { name: 'Analyze', href: '/analyze' },
  { name: 'Automate', href: '/automate' },
  { name: 'Configure', href: '/configure' },
];

export default function TopNavigation() {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function checkSuperAdmin() {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          setIsSuperAdmin(data.isSuperAdmin || false);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
      }
    }
    checkSuperAdmin();
  }, []);

  const isActiveTab = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <nav className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="h-full flex items-center justify-between px-6">
        {/* Left: Navigation tabs */}
        <div className="flex items-center space-x-1">
          {navigationTabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActiveTab(tab.href)
                  ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Right: Actions and user menu */}
        <div className="flex items-center space-x-4">
          {isSuperAdmin && (
            <Link
              href="/__super_admin__/users"
              className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Super Admin
            </Link>
          )}
          
          <button className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          <ThemeToggle />
          
          <ProjectSwitcher />
        </div>
      </div>
    </nav>
  );
}
