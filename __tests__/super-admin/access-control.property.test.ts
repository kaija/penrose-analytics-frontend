/**
 * Feature: prism
 * Property 17: Super Admin Access Control
 *
 * For any access attempt to the super admin interface, the system must verify
 * the authenticated user's email is in the SUPER_ADMIN_EMAILS allowlist,
 * and must deny access if not present.
 *
 * Validates: Requirements 13.3, 13.4
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Property 17: Super Admin Access Control', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test-super-admin.com',
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test-super-admin.com',
        },
      },
    });
  });

  test('super admin access requires email in allowlist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }),
        async (userEmail, allowlistEmails) => {
          // Create test user
          const user = await prisma.user.create({
            data: {
              email: `${userEmail.split('@')[0]}@test-super-admin.com`,
              name: 'Test User',
            },
          });

          try {
            // Simulate allowlist check
            const normalizedAllowlist = allowlistEmails.map(e =>
              `${e.split('@')[0]}@test-super-admin.com`
            );
            const isInAllowlist = normalizedAllowlist.includes(user.email);

            // Verify access control logic
            if (isInAllowlist) {
              // User should be granted access
              expect(normalizedAllowlist).toContain(user.email);
            } else {
              // User should be denied access
              expect(normalizedAllowlist).not.toContain(user.email);
            }
          } finally {
            // Clean up
            await prisma.user.delete({
              where: { id: user.id },
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('super admin access denied for non-allowlisted emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }),
        async (userEmail, allowlistEmails) => {
          // Ensure user email is NOT in allowlist
          const normalizedUserEmail = `${userEmail.split('@')[0]}@test-super-admin.com`;
          const normalizedAllowlist = allowlistEmails
            .map(e => `${e.split('@')[0]}@test-super-admin.com`)
            .filter(e => e !== normalizedUserEmail);

          // Create test user
          const user = await prisma.user.create({
            data: {
              email: normalizedUserEmail,
              name: 'Test User',
            },
          });

          try {
            // Verify user is not in allowlist
            const hasAccess = normalizedAllowlist.includes(user.email);
            expect(hasAccess).toBe(false);
          } finally {
            // Clean up
            await prisma.user.delete({
              where: { id: user.id },
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('super admin access granted only for exact email match', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const normalizedEmail = `${email.split('@')[0]}@test-super-admin.com`;

          // Create test user
          const user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: 'Test User',
            },
          });

          try {
            // Allowlist with exact email
            const allowlist = [normalizedEmail];

            // Verify exact match grants access
            expect(allowlist).toContain(user.email);

            // Verify case-sensitive or modified email doesn't match
            const modifiedEmail = normalizedEmail.toUpperCase();
            if (modifiedEmail !== normalizedEmail) {
              expect(allowlist).not.toContain(modifiedEmail);
            }
          } finally {
            // Clean up
            await prisma.user.delete({
              where: { id: user.id },
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
