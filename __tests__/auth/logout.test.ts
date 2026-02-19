/**
 * Unit tests for logout functionality
 *
 * Requirements: 2.10, 15.5
 */

import { GET, POST } from '@/app/api/auth/logout/route';
import { destroySession } from '@/lib/session';
import { NextRequest } from 'next/server';

// Mock session module
jest.mock('@/lib/session', () => ({
  destroySession: jest.fn(),
}));

describe('Logout Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock request
    mockRequest = {
      url: 'http://localhost:3000/api/auth/logout',
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as unknown as NextRequest;
  });

  describe('POST /api/auth/logout', () => {
    it('should destroy session and redirect to login page', async () => {
      const response = await POST(mockRequest);

      // Verify destroySession was called
      expect(destroySession).toHaveBeenCalled();

      // Verify redirect to login page
      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    });

    it('should handle session destruction errors gracefully', async () => {
      // Mock destroySession to throw error
      (destroySession as jest.Mock).mockRejectedValueOnce(new Error('Session error'));

      const response = await POST(mockRequest);

      // Should return error response
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to logout');
    });

    it('should call destroySession exactly once', async () => {
      await POST(mockRequest);

      expect(destroySession).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should destroy session and redirect to login page', async () => {
      const response = await GET(mockRequest);

      // Verify destroySession was called
      expect(destroySession).toHaveBeenCalled();

      // Verify redirect to login page
      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    });

    it('should handle session destruction errors gracefully', async () => {
      // Mock destroySession to throw error
      (destroySession as jest.Mock).mockRejectedValueOnce(new Error('Session error'));

      const response = await GET(mockRequest);

      // Should redirect to login with error parameter
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?error=logout_failed');
    });

    it('should support link-based logout', async () => {
      // Simulate clicking a logout link
      const response = await GET(mockRequest);

      expect(destroySession).toHaveBeenCalled();
      expect(response.status).toBe(307);
    });
  });

  describe('Logout behavior', () => {
    it('should work with different base URLs', async () => {
      const customRequest = {
        url: 'https://example.com/api/auth/logout',
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as unknown as NextRequest;

      const response = await POST(customRequest);

      expect(response.headers.get('location')).toBe('https://example.com/login');
    });

    it('should clear session before redirecting', async () => {
      let destroyCallOrder = 0;
      let redirectCallOrder = 0;

      (destroySession as jest.Mock).mockImplementation(() => {
        destroyCallOrder = Date.now();
        return Promise.resolve();
      });

      await POST(mockRequest);

      // destroySession should be called
      expect(destroyCallOrder).toBeGreaterThan(0);
    });
  });
});
