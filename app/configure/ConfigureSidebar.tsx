'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ConfigureSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="p-4 space-y-6">
      {/* Install Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
          Install
        </h3>
        <div className="space-y-1">
          <Link
            href="/configure/project-status"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/project-status')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Project Status
          </Link>
        </div>
      </div>

      {/* Manage Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
          Manage
        </h3>
        <div className="space-y-1">
          <Link
            href="/configure/segments"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/segments')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Segments
          </Link>
          <Link
            href="/configure/id-hierarchy"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/id-hierarchy')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            ID Hierarchy
          </Link>
          <Link
            href="/configure/event-schema"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/event-schema')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Event Schema
          </Link>
          <Link
            href="/configure/user-schema"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/user-schema')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            User Schema
          </Link>
          <Link
            href="/configure/system-properties"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/system-properties')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            System Properties
          </Link>
          <Link
            href="/configure/archive"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/archive')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Archive
          </Link>
        </div>
      </div>

      {/* Users Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
          Users
        </h3>
        <div className="space-y-1">
          <Link
            href="/configure/users"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/users')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Users
          </Link>
          <Link
            href="/configure/groups"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/groups')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Groups
          </Link>
        </div>
      </div>

      {/* Admin Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
          Admin
        </h3>
        <div className="space-y-1">
          <Link
            href="/configure/project-history"
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              isActive('/configure/project-history')
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Project History
          </Link>
        </div>
      </div>
    </div>
  );
}
