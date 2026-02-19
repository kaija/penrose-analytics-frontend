/**
 * Dashboard Detail API Routes
 *
 * PUT /api/dashboards/[id] - Update a dashboard
 * DELETE /api/dashboards/[id] - Delete a dashboard
 *
 * Requirements: 7.10
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getDashboard, updateDashboard, deleteDashboard } from '@/lib/dashboard';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateStringLength,
} from '@/lib/errors';

/**
 * PUT /api/dashboards/[id]
 * Update a dashboard
 * Requires editor+ permissions
 *
 * Requirements: 7.10
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get dashboard ID from params
  const params = await context?.params;
  const dashboardId = params?.id;
  if (!dashboardId) {
    throw new NotFoundError('Dashboard');
  }

  // Get dashboard to verify it exists and get project ID
  const dashboard = await getDashboard(dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard');
  }

  // Enforce editor+ permissions (dashboard:update)
  await enforcePermission(session.userId, dashboard.projectId, 'dashboard:update');

  // Parse request body
  const body = await request.json();

  // Validate string length if name is provided
  if (body.name !== undefined) {
    validateStringLength(body, {
      name: { min: 1, max: 100 },
    });
  }

  // Update dashboard
  const updatedDashboard = await updateDashboard(dashboardId, {
    ...(body.name !== undefined && { name: body.name }),
  });

  return successResponse(updatedDashboard);
});

/**
 * DELETE /api/dashboards/[id]
 * Delete a dashboard
 * Requires editor+ permissions
 *
 * Requirements: 7.10
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  // Validate session
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  // Get dashboard ID from params
  const params = await context?.params;
  const dashboardId = params?.id;
  if (!dashboardId) {
    throw new NotFoundError('Dashboard');
  }

  // Get dashboard to verify it exists and get project ID
  const dashboard = await getDashboard(dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard');
  }

  // Enforce editor+ permissions (dashboard:delete)
  await enforcePermission(session.userId, dashboard.projectId, 'dashboard:delete');

  // Delete dashboard
  await deleteDashboard(dashboardId);

  return successResponse({ message: 'Dashboard deleted successfully' });
});
