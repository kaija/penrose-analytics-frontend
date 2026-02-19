'use client';

import { useState } from 'react';
import { ProjectWithStats } from './ProjectListSection';
import { UserWithMemberships } from './UserListSection';
import UserDetailView from './UserDetailView';
import EventUsageChart from './EventUsageChart';

interface SuperAdminDashboardClientProps {
  initialProjects: ProjectWithStats[];
  initialUsers: UserWithMemberships[];
}

type TabType = 'projects' | 'users';

export default function SuperAdminDashboardClient({
  initialProjects,
  initialUsers,
}: SuperAdminDashboardClientProps) {
  const [projects] = useState<ProjectWithStats[]>(initialProjects);
  const [users] = useState<UserWithMemberships[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accessingProject, setAccessingProject] = useState(false);

  // Filter states
  const [projectFilterText, setProjectFilterText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');

  // Find selected project for event chart
  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  // Find selected user for detail view
  const selectedUser = selectedUserId
    ? users.find(u => u.id === selectedUserId)
    : null;

  // Filtered data
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectFilterText.toLowerCase()) ||
    project.id.toLowerCase().includes(projectFilterText.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userSearchText.toLowerCase()) ||
    user.name.toLowerCase().includes(userSearchText.toLowerCase())
  );

  // Handle project access simulation
  const handleAccessProject = async (projectId: string) => {
    setAccessingProject(true);

    try {
      const response = await fetch('/api/super-admin/access-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to access project');
      }

      const result = await response.json();

      // Redirect to project dashboard
      window.location.href = result.redirectUrl;
    } catch (error) {
      console.error('Error accessing project:', error);
      alert('Failed to access project. Please try again.');
      setAccessingProject(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSidebarCollapsed(true);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSidebarCollapsed(true);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedProjectId(null);
    setSelectedUserId(null);
    setSidebarCollapsed(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header with Tabs */}
      <div className="bg-red-600 text-white">
        <div className="px-6 py-4 border-b border-red-700">
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-sm text-red-100">System-wide administration</p>
        </div>

        {/* Tabs */}
        <div className="px-6 flex space-x-1">
          <button
            onClick={() => handleTabChange('projects')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-t-lg'
                : 'text-red-100 hover:text-white hover:bg-red-700'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => handleTabChange('users')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-t-lg'
                : 'text-red-100 hover:text-white hover:bg-red-700'
            }`}
          >
            Users
          </button>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-80'
          } flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {activeTab === 'projects' ? 'All Projects' : 'All Users'}
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'projects' ? (
                <div className="p-4 space-y-4">
                  {/* Project Filter */}
                  <input
                    type="text"
                    value={projectFilterText}
                    onChange={(e) => setProjectFilterText(e.target.value)}
                    placeholder="Filter projects..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />

                  {/* Project List */}
                  <div className="space-y-2">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedProjectId === project.id
                            ? 'bg-red-50 dark:bg-red-950 border-2 border-red-500'
                            : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                        }`}
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {project.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {project.memberCount} members
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            project.enabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {project.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccessProject(project.id);
                            }}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* User Search */}
                  <input
                    type="text"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    placeholder="Search users..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />

                  {/* User List */}
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUserId === user.id
                            ? 'bg-red-50 dark:bg-red-950 border-2 border-red-500'
                            : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                        }`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <div className="flex items-center space-x-2">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'projects' && selectedProject ? (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedProject.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Project ID: {selectedProject.id}
                </p>
              </div>
              <EventUsageChart
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                onClose={() => setSelectedProjectId(null)}
              />
            </div>
          ) : activeTab === 'users' && selectedUser ? (
            <div>
              <UserDetailView
                user={selectedUser}
                onClose={() => setSelectedUserId(null)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg">
                  {activeTab === 'projects'
                    ? 'Select a project to view details'
                    : 'Select a user to view details'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay for project access */}
      {accessingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="text-gray-900 dark:text-gray-100">
              Accessing project...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
