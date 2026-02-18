/**
 * Property-based tests for Segment RBAC permission system
 *
 * **Feature: segment-management, Property 11: Segment RBAC 權限控管**
 * **Validates: Requirements 7.1, 7.2**
 *
 * Testing Framework: fast-check + Jest
 */

import * as fc from 'fast-check';
import { ROLE_PERMISSIONS, getRolePermissions, Action } from '@/lib/rbac';
import { Role } from '@prisma/client';

/** Segment-specific actions */
const SEGMENT_ACTIONS: Action[] = [
  'segment:read',
  'segment:create',
  'segment:update',
  'segment:delete',
];

/** All roles in the system */
const ALL_ROLES: Role[] = ['viewer', 'editor', 'admin', 'owner'];

/** Roles that should have write access to segments (editor+) */
const SEGMENT_WRITE_ROLES: Role[] = ['editor', 'admin', 'owner'];

/** Segment write actions (create, update, delete) */
const SEGMENT_WRITE_ACTIONS: Action[] = [
  'segment:create',
  'segment:update',
  'segment:delete',
];

describe('Segment RBAC Property Tests', () => {
  /**
   * Property 11: Segment RBAC 權限控管
   *
   * *For any* 使用者與 Segment 操作，viewer 角色應能讀取但不能建立/修改/刪除，
   * editor 以上角色應能執行所有 CRUD 操作。
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  test('Property 11: viewer can read segments but cannot create/update/delete', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEGMENT_ACTIONS),
        (action) => {
          const viewerPermissions = ROLE_PERMISSIONS.viewer;
          const hasPermission = viewerPermissions.includes(action);

          if (action === 'segment:read') {
            // Requirement 7.1: viewer 以上角色可讀取 Segment
            expect(hasPermission).toBe(true);
          } else {
            // Requirement 7.2: viewer 不能建立、修改、刪除 Segment
            expect(hasPermission).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: editor+ roles can perform all segment CRUD operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEGMENT_WRITE_ROLES),
        fc.constantFrom(...SEGMENT_ACTIONS),
        (role, action) => {
          const permissions = ROLE_PERMISSIONS[role];
          const hasPermission = permissions.includes(action);

          // Requirement 7.1 & 7.2: editor, admin, owner 應能執行所有 Segment CRUD
          expect(hasPermission).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: getRolePermissions is consistent with ROLE_PERMISSIONS for segment actions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...SEGMENT_ACTIONS),
        (role, action) => {
          const permissions = getRolePermissions(role);
          const fromMatrix = ROLE_PERMISSIONS[role].includes(action);
          const fromFunction = permissions.includes(action);

          expect(fromFunction).toBe(fromMatrix);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: segment permission hierarchy is maintained (editor ⊆ admin ⊆ owner)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEGMENT_ACTIONS),
        (action) => {
          const viewerHas = ROLE_PERMISSIONS.viewer.includes(action);
          const editorHas = ROLE_PERMISSIONS.editor.includes(action);
          const adminHas = ROLE_PERMISSIONS.admin.includes(action);
          const ownerHas = ROLE_PERMISSIONS.owner.includes(action);

          // Hierarchy: if viewer has it, editor must too, etc.
          if (viewerHas) expect(editorHas).toBe(true);
          if (editorHas) expect(adminHas).toBe(true);
          if (adminHas) expect(ownerHas).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: viewer cannot perform any segment write action', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SEGMENT_WRITE_ACTIONS),
        (action) => {
          const viewerPermissions = ROLE_PERMISSIONS.viewer;
          // Requirement 7.2: viewer 不能建立/修改/刪除 Segment
          expect(viewerPermissions.includes(action)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
