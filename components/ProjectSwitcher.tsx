'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, LogOut } from './icons';
import { useUser } from '@/contexts/UserContext';

interface Project {
  id: string;
  name: string;
}

export default function ProjectSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { userData, isLoading, refreshUserData } = useUser();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = userData?.user || {
    name: isLoading ? 'Loading...' : 'User',
    email: isLoading ? '' : 'No email',
    avatar: null,
  };

  const projects = userData?.projects || [];
  const activeProjectId = userData?.activeProjectId;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    // Will be implemented with actual logout logic
    window.location.href = '/api/auth/logout';
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors"
      >
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentUser.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeProject?.name || 'No Project'}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-medium">
          {currentUser.name.charAt(0)}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50">
          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-medium">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currentUser.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser.email}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Projects list */}
          <div className="max-h-64 overflow-y-auto">
            <div className="p-2">
              {/* Projects section */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                PROJECTS
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/projects/${project.id}/switch`, {
                        method: 'POST',
                      });
                      if (response.ok) {
                        // Refresh user data to get updated activeProjectId
                        await refreshUserData();
                        // Reload the page to reflect the new active project
                        window.location.reload();
                      }
                    } catch (error) {
                      console.error('Error switching project:', error);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    project.id === activeProjectId
                      ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-800">
            {userData?.isSuperAdmin && (
              <button
                onClick={() => {
                  // Navigate to projects page to add a new project
                  window.location.href = '/projects';
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
