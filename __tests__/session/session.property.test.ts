/**
 * Property-based tests for session management
 *
 * Feature: prism
 * Testing Framework: fast-check
 */

import * as fc from 'fast-check';
import { createSession, validateSession, destroySession } from '@/lib/session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock iron-session
jest.mock('iron-session', () => ({
  getIronSession: jest.fn(),
}));

describe('Session Management Property Tests', () => {
  let mockCookieStore: any;
  let mockSession: any;
  let sessionOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      userId: undefined,
      activeProjectId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    };

    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Capture session options when getIronSession is called
    (getIronSession as jest.Mock).mockImplementation((store, options) => {
      sessionOptions = options;
      return Promise.resolve(mockSession);
    });
  });

  /**
   * Property 1: Session Cookie Security Attributes
   *
   * For any session cookie created by the system, the cookie must have:
   * - httpOnly flag set to true
   * - sameSite attribute set to 'lax'
   * - secure flag set to true in production environments
   *
   * **Validates: Requirements 2.6, 2.8, 15.2**
   */
  test('Property 1: Session cookies have correct security attributes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.oneof(fc.uuid(), fc.constant(null)), // activeProjectId
        async (userId, activeProjectId) => {
          // Create a session
          await createSession(userId, activeProjectId);

          // Verify getIronSession was called with correct options
          expect(getIronSession).toHaveBeenCalled();
          expect(sessionOptions).toBeDefined();
          expect(sessionOptions.cookieOptions).toBeDefined();

          // Requirement 2.6 & 15.2: httpOnly flag must be true
          // This prevents client-side JavaScript from accessing the session cookie
          expect(sessionOptions.cookieOptions.httpOnly).toBe(true);

          // Requirement 2.8: sameSite attribute must be 'lax'
          // This provides CSRF protection while allowing normal navigation
          expect(sessionOptions.cookieOptions.sameSite).toBe('lax');

          // Requirement 2.7: secure flag must be true in production
          // This ensures cookies are only sent over HTTPS in production
          if (process.env.NODE_ENV === 'production') {
            expect(sessionOptions.cookieOptions.secure).toBe(true);
          }

          // Additional security validations
          expect(sessionOptions.cookieOptions.path).toBe('/');
          expect(sessionOptions.cookieOptions.maxAge).toBeGreaterThan(0);
          expect(sessionOptions.cookieName).toBe('prism_session');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Session Content Completeness
   *
   * For any successful authentication, the created session must contain both
   * userId and activeProjectId fields (activeProjectId may be null for first-time users).
   *
   * **Validates: Requirements 2.9, 15.1**
   */
  test('Property 2: Sessions contain userId and activeProjectId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.oneof(fc.uuid(), fc.constant(null)), // activeProjectId
        async (userId, activeProjectId) => {
          // Create session
          await createSession(userId, activeProjectId);

          // Verify session data was set
          expect(mockSession.userId).toBe(userId);
          expect(mockSession.activeProjectId).toBe(activeProjectId);
          expect(mockSession.save).toHaveBeenCalled();

          // Reset for validation test
          jest.clearAllMocks();
          (getIronSession as jest.Mock).mockResolvedValue(mockSession);

          // Validate session returns correct data
          const validated = await validateSession();
          expect(validated).not.toBeNull();
          expect(validated?.userId).toBe(userId);
          expect(validated?.activeProjectId).toBe(activeProjectId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Session Validation
   *
   * For any incoming request with a session cookie, the system must validate
   * the session on the server, and if invalid or expired, must redirect to
   * the login page (represented here by returning null).
   *
   * **Validates: Requirements 15.3, 15.4**
   */
  test('Property 19: Invalid sessions return null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // hasUserId
        fc.oneof(fc.uuid(), fc.constant(null)), // activeProjectId
        async (hasUserId, activeProjectId) => {
          // Setup session state
          mockSession.userId = hasUserId ? 'user-' + Math.random() : undefined;
          mockSession.activeProjectId = activeProjectId;

          (getIronSession as jest.Mock).mockResolvedValue(mockSession);

          // Validate session
          const result = await validateSession();

          if (hasUserId) {
            // Valid session should return data
            expect(result).not.toBeNull();
            expect(result?.userId).toBe(mockSession.userId);
            expect(result?.activeProjectId).toBe(activeProjectId);
          } else {
            // Invalid session (no userId) should return null
            expect(result).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Session destruction clears all data
   *
   * For any session, calling destroySession must clear the session data.
   */
  test('Property: Session destruction is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // number of destroy calls
        async (numCalls) => {
          // Reset mock for this iteration
          const localMockSession = {
            userId: undefined,
            activeProjectId: undefined,
            save: jest.fn().mockResolvedValue(undefined),
            destroy: jest.fn(),
          };

          (getIronSession as jest.Mock).mockResolvedValue(localMockSession);

          // Call destroy multiple times
          for (let i = 0; i < numCalls; i++) {
            await destroySession();
          }

          // Verify destroy was called the correct number of times
          expect(localMockSession.destroy).toHaveBeenCalledTimes(numCalls);
        }
      ),
      { numRuns: 100 }
    );
  });
});
