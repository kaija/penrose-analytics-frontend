/**
 * Unit tests for RBAC permission system
 *
 * Feature: prism
 */

import {
  canPerformAction,
  getRolePermissions,
  enforcePermission,
  ROLE_PERMISSIONS,
  Action,
} from '@/lib/rbac';
import { getUserRole } from '@/lib/project';
import { Role } from '@prisma/client';

// Mock project module
jest.mock('@/lib/project', () => ({
  getUserRole: jest.fn(),
}));

describe('RBAC Permission System Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ROLE_PERMISSIONS matrix', () => {
    test('owner has all permissions', () => {
      const ownerPerms = ROLE_PERMISSIONS.owner;

      // Owner should have all action types
      expect(ownerPerms).toContain('project:read');
      expect(ownerPerms).toContain('project:update');
      expect(ownerPerms).toContain('project:delete');
      expect(ownerPerms).toContain('members:read');
      expect(ownerPerms).toContain('members:invite');
      expect(ownerPerms).toContain('members:update');
      expect(ownerPerms).toContain('members:remove');
      expect(ownerPerms).toContain('dashboard:create');
      expect(ownerPerms).toContain('dashboard:read');
      expect(ownerPerms).toContain('dashboard:update');
      expect(ownerPerms).toContain('dashboard:delete');
      expect(ownerPerms).toContain('report:create');
      expect(ownerPerms).toContain('report:read');
      expect(ownerPerms).toContain('report:update');
      expect(ownerPerms).toContain('report:delete');
      expect(ownerPerms).toContain('profile:read');
      expect(ownerPerms).toContain('event:read');
    });

    test('admin has member management but not project deletion', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;

      // Admin should have member management
      expect(adminPerms).toContain('members:read');
      expect(adminPerms).toContain('members:invite');
      expect(adminPerms).toContain('members:update');
      expect(adminPerms).toContain('members:remove');

      // Admin should have project read and update
      expect(adminPerms).toContain('project:read');
      expect(adminPerms).toContain('project:update');

      // Admin should NOT have project deletion (ownership transfer)
      expect(adminPerms).not.toContain('project:delete');

      // Admin should have dashboard and report CRUD
      expect(adminPerms).toContain('dashboard:create');
      expect(adminPerms).toContain('dashboard:read');
      expect(adminPerms).toContain('dashboard:update');
      expect(adminPerms).toContain('dashboard:delete');
      expect(adminPerms).toContain('report:create');
      expect(adminPerms).toContain('report:read');
      expect(adminPerms).toContain('report:update');
      expect(adminPerms).toContain('report:delete');
    });

    test('editor has dashboard/report CRUD but no member management', () => {
      const editorPerms = ROLE_PERMISSIONS.editor;

      // Editor should have dashboard and report CRUD
      expect(editorPerms).toContain('dashboard:create');
      expect(editorPerms).toContain('dashboard:read');
      expect(editorPerms).toContain('dashboard:update');
      expect(editorPerms).toContain('dashboard:delete');
      expect(editorPerms).toContain('report:create');
      expect(editorPerms).toContain('report:read');
      expect(editorPerms).toContain('report:update');
      expect(editorPerms).toContain('report:delete');

      // Editor should have read access to profiles and events
      expect(editorPerms).toContain('profile:read');
      expect(editorPerms).toContain('event:read');

      // Editor should have project read
      expect(editorPerms).toContain('project:read');

      // Editor should NOT have member management
      expect(editorPerms).not.toContain('members:read');
      expect(editorPerms).not.toContain('members:invite');
      expect(editorPerms).not.toContain('members:update');
      expect(editorPerms).not.toContain('members:remove');

      // Editor should NOT have project update or delete
      expect(editorPerms).not.toContain('project:update');
      expect(editorPerms).not.toContain('project:delete');
    });

    test('viewer has only read permissions', () => {
      const viewerPerms = ROLE_PERMISSIONS.viewer;

      // Viewer should have read-only access
      expect(viewerPerms).toContain('project:read');
      expect(viewerPerms).toContain('dashboard:read');
      expect(viewerPerms).toContain('report:read');
      expect(viewerPerms).toContain('profile:read');
      expect(viewerPerms).toContain('event:read');

      // Viewer should NOT have any create/update/delete permissions
      expect(viewerPerms).not.toContain('dashboard:create');
      expect(viewerPerms).not.toContain('dashboard:update');
      expect(viewerPerms).not.toContain('dashboard:delete');
      expect(viewerPerms).not.toContain('report:create');
      expect(viewerPerms).not.toContain('report:update');
      expect(viewerPerms).not.toContain('report:delete');
      expect(viewerPerms).not.toContain('project:update');
      expect(viewerPerms).not.toContain('project:delete');

      // Viewer should NOT have member management
      expect(viewerPerms).not.toContain('members:read');
      expect(viewerPerms).not.toContain('members:invite');
      expect(viewerPerms).not.toContain('members:update');
      expect(viewerPerms).not.toContain('members:remove');
    });
  });

  describe('getRolePermissions', () => {
    test('returns correct permissions for owner', () => {
      const permissions = getRolePermissions('owner');
      expect(permissions).toEqual(ROLE_PERMISSIONS.owner);
      expect(permissions.length).toBeGreaterThan(0);
    });

    test('returns correct permissions for admin', () => {
      const permissions = getRolePermissions('admin');
      expect(permissions).toEqual(ROLE_PERMISSIONS.admin);
      expect(permissions.length).toBeGreaterThan(0);
    });

    test('returns correct permissions for editor', () => {
      const permissions = getRolePermissions('editor');
      expect(permissions).toEqual(ROLE_PERMISSIONS.editor);
      expect(permissions.length).toBeGreaterThan(0);
    });

    test('returns correct permissions for viewer', () => {
      const permissions = getRolePermissions('viewer');
      expect(permissions).toEqual(ROLE_PERMISSIONS.viewer);
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('canPerformAction', () => {
    test('returns true when user has required permission', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('editor' as Role);

      const result = await canPerformAction('user-1', 'project-1', 'dashboard:create');

      expect(result).toBe(true);
      expect(getUserRole).toHaveBeenCalledWith('user-1', 'project-1');
    });

    test('returns false when user lacks required permission', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('viewer' as Role);

      const result = await canPerformAction('user-1', 'project-1', 'dashboard:create');

      expect(result).toBe(false);
      expect(getUserRole).toHaveBeenCalledWith('user-1', 'project-1');
    });

    test('returns false when user is not a project member', async () => {
      (getUserRole as jest.Mock).mockResolvedValue(null);

      const result = await canPerformAction('user-1', 'project-1', 'project:read');

      expect(result).toBe(false);
      expect(getUserRole).toHaveBeenCalledWith('user-1', 'project-1');
    });

    test('owner can perform all actions', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('owner' as Role);

      const actions: Action[] = [
        'project:delete',
        'members:remove',
        'dashboard:create',
        'report:update',
      ];

      for (const action of actions) {
        const result = await canPerformAction('user-1', 'project-1', action);
        expect(result).toBe(true);
      }
    });

    test('admin cannot delete project', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('admin' as Role);

      const result = await canPerformAction('user-1', 'project-1', 'project:delete');

      expect(result).toBe(false);
    });

    test('editor cannot manage members', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('editor' as Role);

      const memberActions: Action[] = [
        'members:read',
        'members:invite',
        'members:update',
        'members:remove',
      ];

      for (const action of memberActions) {
        const result = await canPerformAction('user-1', 'project-1', action);
        expect(result).toBe(false);
      }
    });

    test('viewer cannot perform any write operations', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('viewer' as Role);

      const writeActions: Action[] = [
        'dashboard:create',
        'dashboard:update',
        'dashboard:delete',
        'report:create',
        'report:update',
        'report:delete',
        'project:update',
        'members:invite',
      ];

      for (const action of writeActions) {
        const result = await canPerformAction('user-1', 'project-1', action);
        expect(result).toBe(false);
      }
    });
  });

  describe('enforcePermission', () => {
    test('does not throw when user has permission', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('owner' as Role);

      await expect(
        enforcePermission('user-1', 'project-1', 'project:delete')
      ).resolves.not.toThrow();
    });

    test('throws when user lacks permission', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('viewer' as Role);

      await expect(
        enforcePermission('user-1', 'project-1', 'dashboard:create')
      ).rejects.toThrow("You don't have permission");

      await expect(
        enforcePermission('user-1', 'project-1', 'dashboard:create')
      ).rejects.toThrow("You don't have permission to perform action 'dashboard:create'");
    });

    test('throws when user is not a project member', async () => {
      (getUserRole as jest.Mock).mockResolvedValue(null);

      await expect(
        enforcePermission('user-1', 'project-1', 'project:read')
      ).rejects.toThrow("You don't have permission");
    });

    test('throws with descriptive error message', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('editor' as Role);

      await expect(
        enforcePermission('user-1', 'project-1', 'members:invite')
      ).rejects.toThrow("You don't have permission to perform action 'members:invite'");
    });
  });

  describe('Edge cases', () => {
    test('handles undefined role gracefully', async () => {
      (getUserRole as jest.Mock).mockResolvedValue(undefined);

      const result = await canPerformAction('user-1', 'project-1', 'project:read');

      expect(result).toBe(false);
    });

    test('permission check is case-sensitive', async () => {
      (getUserRole as jest.Mock).mockResolvedValue('owner' as Role);

      // This should work (correct case)
      const result1 = await canPerformAction('user-1', 'project-1', 'project:read');
      expect(result1).toBe(true);

      // This would not match if we had 'Project:Read' (but TypeScript prevents this)
    });

    test('different users have independent permissions', async () => {
      // User 1 is owner
      (getUserRole as jest.Mock).mockImplementation((userId, projectId) => {
        if (userId === 'user-1') return Promise.resolve('owner' as Role);
        if (userId === 'user-2') return Promise.resolve('viewer' as Role);
        return Promise.resolve(null);
      });

      const result1 = await canPerformAction('user-1', 'project-1', 'project:delete');
      const result2 = await canPerformAction('user-2', 'project-1', 'project:delete');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    test('same user has different permissions in different projects', async () => {
      (getUserRole as jest.Mock).mockImplementation((userId, projectId) => {
        if (projectId === 'project-1') return Promise.resolve('owner' as Role);
        if (projectId === 'project-2') return Promise.resolve('viewer' as Role);
        return Promise.resolve(null);
      });

      const result1 = await canPerformAction('user-1', 'project-1', 'dashboard:create');
      const result2 = await canPerformAction('user-1', 'project-2', 'dashboard:create');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });
});
