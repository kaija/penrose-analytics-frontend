/**
 * Dashboard Management Module
 *
 * Provides functions for managing dashboard CRUD operations.
 * Dashboards are collections of visualization widgets showing analytics data.
 *
 * Requirements: 7.1, 7.9, 7.10
 */

import { prisma } from './prisma';
import { NotFoundError } from './errors';

/**
 * Create a new dashboard
 *
 * @param projectId - The ID of the project
 * @param name - The name of the dashboard
 * @returns The created dashboard
 *
 * Requirements: 7.9
 */
export async function createDashboard(projectId: string, name: string) {
  const dashboard = await prisma.dashboard.create({
    data: {
      projectId,
      name,
    },
  });

  return dashboard;
}

/**
 * Get all dashboards for a project
 *
 * @param projectId - The ID of the project
 * @returns Array of dashboards
 *
 * Requirements: 7.1
 */
export async function getProjectDashboards(projectId: string) {
  const dashboards = await prisma.dashboard.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return dashboards;
}

/**
 * Get a dashboard by ID
 *
 * @param dashboardId - The ID of the dashboard
 * @returns The dashboard or null if not found
 *
 * Requirements: 7.10
 */
export async function getDashboard(dashboardId: string) {
  const dashboard = await prisma.dashboard.findUnique({
    where: {
      id: dashboardId,
    },
  });

  return dashboard;
}

/**
 * Update a dashboard
 *
 * @param dashboardId - The ID of the dashboard
 * @param updates - The fields to update
 * @returns The updated dashboard
 * @throws NotFoundError if dashboard doesn't exist
 *
 * Requirements: 7.10
 */
export async function updateDashboard(
  dashboardId: string,
  updates: { name?: string }
) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
  });

  if (!dashboard) {
    throw new NotFoundError('Dashboard');
  }

  const updatedDashboard = await prisma.dashboard.update({
    where: { id: dashboardId },
    data: updates,
  });

  return updatedDashboard;
}

/**
 * Delete a dashboard
 *
 * @param dashboardId - The ID of the dashboard
 * @throws NotFoundError if dashboard doesn't exist
 *
 * Requirements: 7.10
 */
export async function deleteDashboard(dashboardId: string) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
  });

  if (!dashboard) {
    throw new NotFoundError('Dashboard');
  }

  await prisma.dashboard.delete({
    where: { id: dashboardId },
  });
}
