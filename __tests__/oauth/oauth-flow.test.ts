/**
 * Unit tests for OAuth flow
 * Tests specific scenarios for Google OAuth authentication
 *
 * Requirements: 2.1, 2.4, 2.5, 2.10
 */

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

describe('OAuth Flow Unit Tests', () => {
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
   * Test: First-time user creates User record
   * Requirement 2.4: When a user completes OAuth for the first time,
   * the system shall create a User record with email, name, and avatar
   */
  describe('First-time user authentication', () => {
    it('should create a new User record for first-time user', async () => {
      // Setup: Mock OAuth state validation
      const state = 'test-state-123';
      const code = 'test-code-456';
      mockCookieStore.get.mockReturnValue({ value: state });

      // Setup: Mock token exchange
      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      // Setup: Mock user info from Google
      const googleUserInfo: GoogleUserInfo = {
        id: 'google-id-123',
        email: 'newuser@example.com',
        verified_email: true,
        name: 'New User',
        given_name: 'New',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
      };
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      // Setup: Mock database - user does not exist
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Setup: Mock user creation
      const createdUser = {
        id: 'user-id-789',
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        avatar: googleUserInfo.picture,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      // Setup: Mock no existing project memberships
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      // Execute: OAuth callback
      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: User record was created with correct data
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          avatar: googleUserInfo.picture,
        },
      });

      // Verify: Session was created with userId and null activeProjectId
      expect(createSession).toHaveBeenCalledWith(createdUser.id, null);

      // Verify: Redirected to onboarding (Requirement 2.5)
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding');
    });

    it('should create User with all required fields from Google OAuth', async () => {
      const state = 'state-abc';
      const code = 'code-xyz';
      mockCookieStore.get.mockReturnValue({ value: state });

      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      const googleUserInfo: GoogleUserInfo = {
        id: 'google-123',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/pic.jpg',
      };
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        avatar: googleUserInfo.picture,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      await GET(request);

      // Verify all required fields are included
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data).toEqual({
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        avatar: googleUserInfo.picture,
      });
      expect(createCall.data.email).toBeTruthy();
      expect(createCall.data.name).toBeTruthy();
      expect(createCall.data.avatar).toBeTruthy();
    });
  });

  /**
   * Test: Returning user retrieves existing User
   * Requirement 2.4: System should retrieve existing user record
   * for returning users
   */
  describe('Returning user authentication', () => {
    it('should retrieve existing User record for returning user', async () => {
      // Setup: Mock OAuth state validation
      const state = 'returning-state';
      const code = 'returning-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      // Setup: Mock token exchange
      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      // Setup: Mock user info from Google
      const googleUserInfo: GoogleUserInfo = {
        id: 'google-id-existing',
        email: 'existing@example.com',
        verified_email: true,
        name: 'Existing User Updated',
        given_name: 'Existing',
        family_name: 'User',
        picture: 'https://example.com/new-avatar.jpg',
      };
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      // Setup: Mock database - user already exists
      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        name: 'Existing User',
        avatar: 'https://example.com/old-avatar.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      // Setup: Mock user update
      const updatedUser = {
        ...existingUser,
        name: googleUserInfo.name,
        avatar: googleUserInfo.picture,
        updatedAt: new Date(),
      };
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      // Setup: Mock existing project membership
      const membership = {
        id: 'membership-id',
        userId: existingUser.id,
        projectId: 'project-id-123',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(membership);

      // Execute: OAuth callback
      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: User was found, not created
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: googleUserInfo.email },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();

      // Verify: User info was updated
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: {
          name: googleUserInfo.name,
          avatar: googleUserInfo.picture,
        },
      });

      // Verify: Session was created with userId and activeProjectId
      expect(createSession).toHaveBeenCalledWith(existingUser.id, membership.projectId);

      // Verify: Redirected to home (not onboarding)
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/');
    });

    it('should not create duplicate user for existing email', async () => {
      const state = 'state-123';
      const code = 'code-456';
      mockCookieStore.get.mockReturnValue({ value: state });

      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      const googleUserInfo: GoogleUserInfo = {
        id: 'google-id',
        email: 'duplicate@example.com',
        verified_email: true,
        name: 'Duplicate Test',
        given_name: 'Duplicate',
        family_name: 'Test',
        picture: 'https://example.com/avatar.jpg',
      };
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      // User already exists
      const existingUser = {
        id: 'existing-id',
        email: 'duplicate@example.com',
        name: 'Old Name',
        avatar: 'https://example.com/old.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        name: googleUserInfo.name,
        avatar: googleUserInfo.picture,
      });
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      await GET(request);

      // Verify: No new user created
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should update user profile information on each login', async () => {
      const state = 'update-state';
      const code = 'update-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      const oldName = 'Old Name';
      const oldAvatar = 'https://example.com/old.jpg';
      const newName = 'New Name';
      const newAvatar = 'https://example.com/new.jpg';

      const googleUserInfo: GoogleUserInfo = {
        id: 'google-id',
        email: 'user@example.com',
        verified_email: true,
        name: newName,
        given_name: 'New',
        family_name: 'Name',
        picture: newAvatar,
      };
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      const existingUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: oldName,
        avatar: oldAvatar,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        name: newName,
        avatar: newAvatar,
      });
      (prisma.projectMembership.findFirst as jest.Mock).mockResolvedValue(null);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      await GET(request);

      // Verify: User profile was updated with new information
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: {
          name: newName,
          avatar: newAvatar,
        },
      });
    });
  });

  /**
   * Test: Missing email returns error
   * Requirement 2.3: When Google OAuth returns user information,
   * the system shall verify the email is provided
   */
  describe('Email validation', () => {
    it('should return error when email is missing from Google OAuth response', async () => {
      // Setup: Mock OAuth state validation
      const state = 'no-email-state';
      const code = 'no-email-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      // Setup: Mock token exchange
      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      // Setup: Mock user info WITHOUT email
      const googleUserInfo = {
        id: 'google-id-no-email',
        email: '', // Empty email
        verified_email: false,
        name: 'No Email User',
        given_name: 'No',
        family_name: 'Email',
        picture: 'https://example.com/avatar.jpg',
      } as GoogleUserInfo;
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      // Execute: OAuth callback
      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: No user was created
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();

      // Verify: No session was created
      expect(createSession).not.toHaveBeenCalled();

      // Verify: Redirected to login with error
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=email_required');
    });

    it('should return error when email is null', async () => {
      const state = 'null-email-state';
      const code = 'null-email-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      // Email is null
      const googleUserInfo = {
        id: 'google-id',
        email: null as any,
        verified_email: false,
        name: 'Null Email User',
        given_name: 'Null',
        family_name: 'Email',
        picture: 'https://example.com/avatar.jpg',
      } as GoogleUserInfo;
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: Authentication rejected
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=email_required');
    });

    it('should return error when email is undefined', async () => {
      const state = 'undefined-email-state';
      const code = 'undefined-email-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      (exchangeCodeForToken as jest.Mock).mockResolvedValue({
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      });

      // Email is undefined
      const googleUserInfo = {
        id: 'google-id',
        // email field is missing
        verified_email: false,
        name: 'Undefined Email User',
        given_name: 'Undefined',
        family_name: 'Email',
        picture: 'https://example.com/avatar.jpg',
      } as any;
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(googleUserInfo);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: Authentication rejected
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=email_required');
    });
  });

  /**
   * Test: OAuth state validation
   * Additional security test for CSRF protection
   */
  describe('OAuth state validation', () => {
    it('should reject request with mismatched state', async () => {
      const storedState = 'stored-state-123';
      const receivedState = 'different-state-456';
      const code = 'test-code';

      mockCookieStore.get.mockReturnValue({ value: storedState });

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${receivedState}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: Request rejected
      expect(exchangeCodeForToken).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      // Verify: Redirected to login with error
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=state_mismatch');
    });

    it('should reject request with missing state', async () => {
      const code = 'test-code';
      mockCookieStore.get.mockReturnValue(undefined);

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: Request rejected
      expect(exchangeCodeForToken).not.toHaveBeenCalled();
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=invalid_request');
    });
  });

  /**
   * Test: OAuth error handling
   * Additional test for OAuth provider errors
   */
  describe('OAuth error handling', () => {
    it('should handle OAuth provider errors', async () => {
      const error = 'access_denied';
      const url = `http://localhost:3000/api/auth/callback/google?error=${error}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: No authentication attempted
      expect(exchangeCodeForToken).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      // Verify: Redirected to login with error
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain(`error=${error}`);
    });

    it('should handle token exchange failures', async () => {
      const state = 'test-state';
      const code = 'invalid-code';
      mockCookieStore.get.mockReturnValue({ value: state });

      // Mock token exchange failure
      (exchangeCodeForToken as jest.Mock).mockRejectedValue(
        new Error('Invalid authorization code')
      );

      const url = `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`;
      const request = new NextRequest(url);
      const response = await GET(request);

      // Verify: No user created
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      // Verify: Redirected to login with error
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('error=authentication_failed');
    });
  });
});
