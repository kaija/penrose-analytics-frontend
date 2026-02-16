'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ConfigurePage() {
  useEffect(() => {
    // Redirect to project status by default
    redirect('/configure/project-status');
  }, []);

  return null;
}
