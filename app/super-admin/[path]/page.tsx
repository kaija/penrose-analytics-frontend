'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SuperAdminDashboardClient from '../components/SuperAdminDashboardClient';
import { ProjectWithStats } from '../components/ProjectListSection';
import { UserWithMemberships } from '../components/UserListSection';

export default function SuperAdminPage() {
  const params = useParams();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [users, setUsers] = useState<UserWithMemberships[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      try {
        // Check if the path matches the environment variable
        const verifyResponse = await fetch(`/api/super-admin/verify?path=${params.path}`);
        if (!verifyResponse.ok) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load data
        const [projectsRes, usersRes] = await Promise.all([
          fetch('/api/super-admin/projects'),
          fetch('/api/super-admin/users'),
        ]);

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load super admin data:', error);
        setAuthorized(false);
        setLoading(false);
      }
    };

    checkAccessAndLoadData();
  }, [params.path]);

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminDashboardClient
      initialProjects={projects}
      initialUsers={users}
    />
  );
}
