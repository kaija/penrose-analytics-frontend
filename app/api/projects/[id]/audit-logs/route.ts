/**
 * Audit Logs API Route
 *
 * GET /api/projects/[id]/audit-logs - Get audit logs for a project
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/error-handler';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { getProjectAuditLogs } from '@/lib/audit-log';

/**
 * GET /api/projects/[id]/audit-logs
 * Get audit logs for a project
 * Requires viewer+ permission
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await validateSession();
  if (!session) {
    throw new AuthenticationError();
  }

  const params = await context?.params;
  const projectId = params?.id;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  // Check permission - viewers can see audit logs
  await enforcePermission(session.userId, projectId, 'project:read');

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const action = searchParams.get('action') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : undefined;
  const endDate = searchParams.get('endDate')
    ? new Date(searchParams.get('endDate')!)
    : undefined;

  // Get audit logs
  const { logs, total } = await getProjectAuditLogs(projectId, {
    limit,
    offset,
    action: action as any,
    userId,
    startDate,
    endDate,
  });

  return successResponse({
    logs,
    total,
    limit,
    offset,
  });
});
