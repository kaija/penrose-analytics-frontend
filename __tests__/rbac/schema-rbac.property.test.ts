/**
 * Property-based tests for Schema RBAC permission system
 *
 * **Feature: segment-management, Property 12: Schema RBAC 權限控管**
 * **Validates: Requirements 7.3, 7.4**
 *
 * Testing Framework: fast-check + Jest
 */

import * as fc from 'fast-check';
import { ROLE_PERMISSIONS, getRolePermissions, Action } from '@/lib/rbac';
import { Role } from '@prisma/client';

/** Schema-specific actions */
const SCHEMA_ACTIONS: Action[] = [
  'schema:read',
  'schema:create',
  'schema:update',
  'schema:delete',
];

/** All roles in the system */
const ALL_ROLES: Role[] = ['viewer', 'editor', 'admin', 'owner'];

/** Roles that should have write access to schemas (admin+) */
const SCHEMA_WRITE_ROLES: Role[] = ['admin', 'owner'];

/** Roles that should NOT have write access to schemas (viewer, editor) */
const SCHEMA_READ_ONLY_ROLES: Role[] = ['viewer', 'editor'];

/** Schema write actions (create, update, delete) */
const SCHEMA_WRITE_ACTIONS: Action[] = [
  'schema:create',
  'schema:update',
  'schema:delete',
];

describe('Schema RBAC Property Tests', () => {
  /**
   * Property 12: Schema RBAC 權限控管
   *
   * *For any* 使用者與 Schema 操作，viewer/editor 角色應能讀取但不能建立/修改/刪除，
   * admin 以上角色應能執行所有 CRUD 操作。
   *
   * **Validates: Requirements 7.3, 7.4**
   */
  test('Property 12: viewer and editor can read schemas but cannot create/update/delete', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMA_READ_ONLY_ROLES),
        fc.constantFrom(...SCHEMA_ACTIONS),
        (role, action) => {
          const permissions = ROLE_PERMISSIONS[role];
          const hasPermission = permissions.includes(action);

          if (action === 'schema:read') {
            // Requirement 7.3: viewer 以上角色可讀取 Schema
            expect(hasPermission).toBe(true);
          } else {
            // Requirement 7.3: viewer/editor 不能建立、修改、刪除 Schema
            expect(hasPermission).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: admin+ roles can perform all schema CRUD operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMA_WRITE_ROLES),
        fc.constantFrom(...SCHEMA_ACTIONS),
        (role, action) => {
          const permissions = ROLE_PERMISSIONS[role];
          const hasPermission = permissions.includes(action);

          // Requirement 7.3: admin, owner 應能執行所有 Schema CRUD
          expect(hasPermission).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: getRolePermissions is consistent with ROLE_PERMISSIONS for schema actions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...SCHEMA_ACTIONS),
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

  test('Property 12: schema permission hierarchy is maintained (admin ⊆ owner)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMA_ACTIONS),
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

  test('Property 12: viewer and editor cannot perform any schema write action', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMA_READ_ONLY_ROLES),
        fc.constantFrom(...SCHEMA_WRITE_ACTIONS),
        (role, action) => {
          const permissions = ROLE_PERMISSIONS[role];
          // Requirement 7.3: viewer/editor 不能建立/修改/刪除 Schema
          expect(permissions.includes(action)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
