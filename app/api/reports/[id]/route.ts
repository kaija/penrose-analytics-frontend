/**
 * Report Detail API Routes
 * 
 * PUT /api/reports/[id] - Update a report
 * DELETE /api/reports/[id] - Delete a report
 * 
 * Requirements: 8.8
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { getReport, updateReport, deleteReport } from '@/lib/report';
import { enforcePermission } from '@/lib/rbac';
import {
  AuthenticationError,
  NotFoundError,
  validateStringLength,
} from '@/lib/errors';

/**
 * PUT /api/reports/[id]
 * Update a report
 * Requires editor+ permissions
 * 
 * Requirements: 8.8
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

  // Get report ID from params
  const params = await context?.params;
  const reportId = params?.id;
  if (!reportId) {
    throw new NotFoundError('Report');
  }

  // Get report to verify it exists and get project ID
  const report = await getReport(reportId);
  if (!report) {
    throw new NotFoundError('Report');
  }

  // Enforce editor+ permissions (report:update)
  await enforcePermission(session.userId, report.projectId, 'report:update');

  // Parse request body
  const body = await request.json();

  // Validate string length if fields are provided
  const validationFields: Record<string, { min: number; max: number }> = {};
  if (body.name !== undefined) {
    validationFields.name = { min: 1, max: 100 };
  }
  if (body.category !== undefined) {
    validationFields.category = { min: 1, max: 50 };
  }
  
  if (Object.keys(validationFields).length > 0) {
    validateStringLength(body, validationFields);
  }

  // Update report
  const updatedReport = await updateReport(reportId, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.config !== undefined && { config: body.config }),
  });

  return successResponse(updatedReport);
});

/**
 * DELETE /api/reports/[id]
 * Delete a report
 * Requires editor+ permissions
 * 
 * Requirements: 8.8
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

  // Get report ID from params
  const params = await context?.params;
  const reportId = params?.id;
  if (!reportId) {
    throw new NotFoundError('Report');
  }

  // Get report to verify it exists and get project ID
  const report = await getReport(reportId);
  if (!report) {
    throw new NotFoundError('Report');
  }

  // Enforce editor+ permissions (report:delete)
  await enforcePermission(session.userId, report.projectId, 'report:delete');

  // Delete report
  await deleteReport(reportId);

  return successResponse({ message: 'Report deleted successfully' });
});
