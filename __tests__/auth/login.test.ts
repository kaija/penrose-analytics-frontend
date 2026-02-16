/**
 * Login Route Tests
 * Tests for the OAuth login initiation route
 * 
 * Requirements: 2.1, 2.2
 */

import { GET } from '@/app/api/auth/login/route';
import { cookies } from 'next/headers';
import { getGoogleAuthorizationUrl, generateState } from '@/lib/oauth';

// Mock dependencies
jest.mock('next/headers');
jest.mock('@/lib/oauth');

describe('GET /api/auth/login', () => {
  let mockCookieStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookie store
    mockCookieStore = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  it('should generate state and redirect to Google OAuth', async () => {
    const mockState = 'test-state-123';
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state-123';

    (generateState as jest.Mock).mockReturnValue(mockState);
    (getGoogleAuthorizationUrl as jest.Mock).mockReturnValue(mockAuthUrl);

    const response = await GET();

    // Verify state was generated
    expect(generateState).toHaveBeenCalled();

    // Verify state was stored in cookie
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'oauth_state',
      mockState,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      })
    );

    // Verify authorization URL was generated
    expect(getGoogleAuthorizationUrl).toHaveBeenCalledWith(mockState);

    // Verify redirect response
    expect(response.status).toBe(307); // Temporary redirect
    expect(response.headers.get('location')).toBe(mockAuthUrl);
  });

  it('should set secure flag in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const mockState = 'test-state-123';
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state-123';

    (generateState as jest.Mock).mockReturnValue(mockState);
    (getGoogleAuthorizationUrl as jest.Mock).mockReturnValue(mockAuthUrl);

    await GET();

    // Verify secure flag is set in production
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'oauth_state',
      mockState,
      expect.objectContaining({
        secure: true,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should not set secure flag in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockState = 'test-state-123';
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state-123';

    (generateState as jest.Mock).mockReturnValue(mockState);
    (getGoogleAuthorizationUrl as jest.Mock).mockReturnValue(mockAuthUrl);

    await GET();

    // Verify secure flag is not set in development
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'oauth_state',
      mockState,
      expect.objectContaining({
        secure: false,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle errors gracefully', async () => {
    (generateState as jest.Mock).mockImplementation(() => {
      throw new Error('State generation failed');
    });

    const response = await GET();

    // Verify error response
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to initiate authentication' });
  });
});
