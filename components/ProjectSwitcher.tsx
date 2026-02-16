'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, LogOut } from './icons';

interface Project {
  id: string;
  name: string;
}

export default function ProjectSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock data - will be replaced with real data from API
  const currentUser = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
  };

  const projects: Project[] = [
    { id: '1', name: 'Project Alpha' },
    { id: '2', name: 'Project Beta' },
    { id: '3', name: 'Project Gamma' },
  ];

  const activeProjectId = '1';

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-medium">
          {currentUser.name.charAt(0)}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentUser.name}
        </span>
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
                placeholder="Search organizations and projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Organization and Projects list */}
          <div className="max-h-64 overflow-y-auto">
            <div className="p-2">
              {/* Organization section (placeholder) */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                ORGANIZATION
              </div>
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                No organization
              </div>
              
              {/* Projects section */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 mt-2">
                PROJECTS
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    // Will be implemented with actual project switching logic
                    console.log('Switch to project:', project.id);
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
            <button
              onClick={() => {
                // Will be implemented with actual add project logic
                console.log('Add project');
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
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
