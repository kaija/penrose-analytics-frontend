'use client';

import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import IdHierarchyClient from './IdHierarchyClient';

interface IdHierarchyWrapperProps {
  projectId: string;
  userRole: string;
}

export default function IdHierarchyWrapper({ projectId, userRole }: IdHierarchyWrapperProps) {
  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <IdHierarchyClient projectId={projectId} userRole={userRole} />
    </MainLayout>
  );
}
