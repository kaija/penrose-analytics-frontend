/**
 * Audit Log Utility
 * 
 * Provides functions to log user actions for security and compliance.
 * Logs are stored in the AuditLog table and can be viewed in the project history.
 */

import { prisma } from './prisma';

export type AuditAction =
  // Authentication
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  
  // Project operations
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.switch'
  
  // Member operations
  | 'member.invite'
  | 'member.update'
  | 'member.remove'
  | 'member.accept_invitation'
  
  // Schema operations
  | 'schema.event.create'
  | 'schema.event.update'
  | 'schema.event.delete'
  | 'schema.user.create'
  | 'schema.user.update'
  | 'schema.user.delete'
  
  // Segment operations
  | 'segment.create'
  | 'segment.update'
  | 'segment.delete'
  
  // Dashboard operations
  | 'dashboard.create'
  | 'dashboard.update'
  | 'dashboard.delete'
  
  // Report operations
  | 'report.create'
  | 'report.update'
  | 'report.delete'
  
  // Profile operations
  | 'profile.create'
  | 'profile.update'
  | 'profile.delete'
  
  // Event operations
  | 'event.create'
  | 'event.update'
  | 'event.delete';

export interface AuditLogDetails {
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  userId: string,
  action: AuditAction,
  details: AuditLogDetails,
  projectId?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        projectId: projectId || null,
        action,
        details: details as any,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs for a project
 */
export async function getProjectAuditLogs(
  projectId: string,
  options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: any = { projectId };
  
  if (options?.userId) {
    where.userId = options.userId;
  }
  
  if (options?.action) {
    where.action = options.action;
  }
  
  if (options?.startDate || options?.endDate) {
    where.timestamp = {};
    if (options.startDate) {
      where.timestamp.gte = options.startDate;
    }
    if (options.endDate) {
      where.timestamp.lte = options.endDate;
    }
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}

/**
 * Get audit logs for a user (including auth logs without projectId)
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: any = { userId };
  
  if (options?.action) {
    where.action = options.action;
  }
  
  if (options?.startDate || options?.endDate) {
    where.timestamp = {};
    if (options.startDate) {
      where.timestamp.gte = options.startDate;
    }
    if (options.endDate) {
      where.timestamp.lte = options.endDate;
    }
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}

/**
 * Extract IP address from request headers
 */
export function getIpAddress(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}
