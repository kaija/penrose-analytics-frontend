'use client';

import MainLayout from '@/components/MainLayout';
import ProjectList from './ProjectList';

interface Project {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectsWrapperProps {
  projects: Project[];
  activeProjectId: string | null;
  isSuperAdmin: boolean;
}

export default function ProjectsWrapper({
  projects,
  activeProjectId,
  isSuperAdmin
}: ProjectsWrapperProps) {
  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your projects and create new ones
          </p>
        </div>

        <ProjectList
          projects={projects}
          activeProjectId={activeProjectId}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </MainLayout>
  );
}
