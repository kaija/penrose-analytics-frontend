import { Role } from '@prisma/client';
import { getUserRole } from './project';
import { AuthorizationError } from './errors';

/**
 * Action types that can be performed in the system
 * These map to specific operations across different resources
 */
export type Action =
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'members:read'
  | 'members:invite'
  | 'members:update'
  | 'members:remove'
  | 'dashboard:create'
  | 'dashboard:read'
  | 'dashboard:update'
  | 'dashboard:delete'
  | 'report:create'
  | 'report:read'
  | 'report:update'
  | 'report:delete'
  | 'profile:read'
  | 'event:read';

/**
 * Permission matrix defining which actions each role can perform
 * 
 * Role hierarchy:
 * - owner: Full access to all actions including ownership transfer
 * - admin: Member management, reports/dashboards, project settings (NO ownership transfer)
 * - editor: Create/modify/delete reports and dashboards, view profiles/events (NO member management)
 * - viewer: Read-only access to reports, dashboards, profiles, events (NO modifications)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */
export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  owner: [
    'project:read',
    'project:update',
    'project:delete',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'dashboard:create',
    'dashboard:read',
    'dashboard:update',
    'dashboard:delete',
    'report:create',
    'report:read',
    'report:update',
    'report:delete',
    'profile:read',
    'event:read',
  ],
  admin: [
    'project:read',
    'project:update',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'dashboard:create',
    'dashboard:read',
    'dashboard:update',
    'dashboard:delete',
    'report:create',
    'report:read',
    'report:update',
    'report:delete',
    'profile:read',
    'event:read',
  ],
  editor: [
    'project:read',
    'dashboard:create',
    'dashboard:read',
    'dashboard:update',
    'dashboard:delete',
    'report:create',
    'report:read',
    'report:update',
    'report:delete',
    'profile:read',
    'event:read',
  ],
  viewer: [
    'project:read',
    'dashboard:read',
    'report:read',
    'profile:read',
    'event:read',
  ],
};

/**
 * Get all permissions for a specific role
 * 
 * @param role - The role to get permissions for
 * @returns Array of actions the role can perform
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.7
 */
export function getRolePermissions(role: Role): Action[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a user can perform a specific action in a project
 * 
 * @param userId - The ID of the user
 * @param projectId - The ID of the project
 * @param action - The action to check permission for
 * @returns true if the user has permission, false otherwise
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
export async function canPerformAction(
  userId: string,
  projectId: string,
  action: Action
): Promise<boolean> {
  // Get the user's role in the project
  const role = await getUserRole(userId, projectId);
  
  // If user is not a member, they have no permissions
  if (!role) {
    return false;
  }
  
  // Check if the role has permission for this action
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}

/**
 * Enforce that a user has permission to perform an action
 * Throws an error if the user doesn't have permission
 * 
 * @param userId - The ID of the user
 * @param projectId - The ID of the project
 * @param action - The action to enforce permission for
 * @throws AuthorizationError if user doesn't have permission
 * 
 * Requirements: 4.9, 4.10, 19.3
 */
export async function enforcePermission(
  userId: string,
  projectId: string,
  action: Action
): Promise<void> {
  const hasPermission = await canPerformAction(userId, projectId, action);
  
  if (!hasPermission) {
    throw new AuthorizationError(`You don't have permission to perform action '${action}'`);
  }
}
