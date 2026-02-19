/**
 * Property-based tests for OAuth authentication
 *
 * Feature: prism
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { GET } from '@/app/api/auth/callback/google/route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForToken,
  getGoogleUserInfo,
  GoogleUserInfo,
} from '@/lib/oauth';
import { createSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/oauth', () => ({
  exchangeCodeForToken: jest.fn(),
  getGoogleUserInfo: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  createSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectMembership: {
      findFirst: jest.fn(),
    },
  },
}));

describe('OAuth Property Tests', () => {
  let mockCookieStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  /**
   * Property 29: OAuth Email Verification
   *
   * For any Google OAuth response, if the email field is not provided,
   * the system must reject the authentication and display an error.
   *
   * **Validates: Requirements 2.3**
   */
  test('Property 29: OAuth rejects authentication when email is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate various OAuth response scenarios
          hasEmail: fc.boolean(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          picture: fc.webUrl(),
          id: fc.uuid(),
          verified_email: fc.boolean(),
          given_name: fc.string({ minLength: 1, maxLength: 50 }),
          family_name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        fc.uuid(), // OAuth code
        fc.uuid(), // OAuth state
        async (userInfoData, code, state) => {
          // Reset all mocks for this iteration
          jest.clearAllMocks();

          // Setup: Mock cookie store with matching state
          mockCookieStore.get.mockReturnValue({ value: state });

          // Setup: Mock token exchange
          (exchangeCodeForToken as jest.Mock).mockResolvedValue({
            access_token: 'mock-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid email profile',
          });

          // Setup: Mock user info response based on hasEmail flag
          const userInfo: Partial<GoogleUserInfo> = {
            id: userInfoData.id,
            email: userInfoData.hasEmail ? userInfoData.email : ('' as any),
            verified_email: userInfoData.verified_email,
            name: userInfoData.name,
            given_name: userInfoData.given_name,
            family_name: userInfoData.family_name,
            picture: userInfoData.picture,
          };

          // If hasEmail is false, remove the email field entirely
          if (!userInfoData.hasEmail) {
            delete userInfo.email;
          }

          (getGoogleUserInfo as jest.Mock).mockResolvedValue(userInfo);

          // Setup: Mock user database operations
          (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
          (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-id',
            email: userInfoData.email,
            name: userInfoData.name,
            avatar: userInfoData.picture,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(
            null
          );

          // Create mock request
          const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
          const request = new NextRequest(url);

          // Execute OAuth callback
          const response = await GET(request);

          // Verify behavior based on email presence
          if (!userInfoData.hasEmail || !userInfo.email) {
            // Requirement 2.3: System must reject authentication when email is missing
            expect(response.status).toBe(307); // Redirect status
            const location = response.headers.get('location');
            expect(location).toContain('/login');
            expect(location).toContain('error=email_required');

            // Verify user was NOT created
            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(createSession).not.toHaveBeenCalled();
          } else {
            // Email is provided - authentication should succeed
            expect(response.status).toBe(307); // Redirect status
            const location = response.headers.get('location');

            // Should redirect to onboarding (new user) or home (existing user)
            expect(location).toMatch(/\/(onboarding|\/)/);
            expect(location).not.toContain('error=email_required');

            // Verify user creation was attempted
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
              where: { email: userInfoData.email },
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: OAuth email verification with various email formats
   *
   * Tests that the system correctly handles different email formats and
   * edge cases in the email field.
   */
  test('Property: OAuth handles various email field states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(undefined), // Email field undefined
          fc.constant(null), // Email field null
          fc.constant(''), // Email field empty string
          fc.emailAddress() // Valid email
        ),
        fc.uuid(), // OAuth code
        fc.uuid(), // OAuth state
        async (emailValue, code, state) => {
          // Reset all mocks for this iteration
          jest.clearAllMocks();

          // Setup mocks
          mockCookieStore.get.mockReturnValue({ value: state });

          (exchangeCodeForToken as jest.Mock).mockResolvedValue({
            access_token: 'mock-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid email profile',
          });

          const userInfo: any = {
            id: 'google-id-123',
            name: 'Test User',
            verified_email: true,
            given_name: 'Test',
            family_name: 'User',
            picture: 'https://example.com/avatar.jpg',
          };

          // Set email based on test case
          if (emailValue !== undefined) {
            userInfo.email = emailValue;
          }

          (getGoogleUserInfo as jest.Mock).mockResolvedValue(userInfo);

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
          (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-id',
            email: emailValue,
            name: 'Test User',
            avatar: 'https://example.com/avatar.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(
            null
          );

          // Create request
          const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
          const request = new NextRequest(url);

          // Execute
          const response = await GET(request);

          // Verify: Only valid, non-empty emails should succeed
          const isValidEmail =
            emailValue &&
            typeof emailValue === 'string' &&
            emailValue.length > 0 &&
            emailValue.includes('@');

          if (!isValidEmail) {
            // Should reject authentication
            const location = response.headers.get('location');
            expect(location).toContain('/login');
            expect(location).toContain('error=email_required');
            expect(createSession).not.toHaveBeenCalled();
          } else {
            // Should accept authentication
            const location = response.headers.get('location');
            expect(location).not.toContain('error=email_required');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
