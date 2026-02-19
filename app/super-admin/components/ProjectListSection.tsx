'use client';

import { useState } from 'react';

export interface ProjectWithStats {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: Date | string;
  memberCount: number;
}

interface ProjectListSectionProps {
  projects: ProjectWithStats[];
  onProjectSelect?: (projectId: string) => void;
  onAccessProject: (projectId: string) => void;
}

export default function ProjectListSection({
  projects,
  onProjectSelect,
  onAccessProject,
}: ProjectListSectionProps) {
  const [filterText, setFilterText] = useState<string>('');

  // Client-side filtering by project name or ID (case-insensitive)
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(filterText.toLowerCase()) ||
    project.id.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          All Projects
        </h2>

        {/* Filter Input */}
        <div className="max-w-md">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by project name or ID..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {filterText ? 'No projects match your filter' : 'No projects found'}
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className={onProjectSelect ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                  onClick={() => onProjectSelect?.(project.id)}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {project.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {project.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      project.enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {project.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {project.memberCount}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccessProject(project.id);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      Access
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
