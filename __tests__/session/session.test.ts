/**
 * Unit tests for session management utilities
 *
 * Requirements: 2.6, 2.7, 2.8, 2.9, 15.2, 15.3, 15.4, 15.5
 */

import { createSession, validateSession, destroySession, updateActiveProject } from '@/lib/session';
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

describe('Session Management', () => {
  let mockCookieStore: any;
  let mockSession: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock session object
    mockSession = {
      userId: undefined,
      activeProjectId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    };

    // Create mock cookie store
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Mock cookies() to return our mock store
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock getIronSession to return our mock session
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('createSession', () => {
    it('should create session with userId and activeProjectId', async () => {
      const userId = 'user-123';
      const projectId = 'project-456';

      await createSession(userId, projectId);

      // Verify session.save was called
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should create session with null activeProjectId for first-time users', async () => {
      const userId = 'user-123';

      await createSession(userId, null);

      // Verify session.save was called
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should handle session creation for multiple users', async () => {
      const users = [
        { userId: 'user-1', projectId: 'project-1' },
        { userId: 'user-2', projectId: null },
        { userId: 'user-3', projectId: 'project-3' },
      ];

      for (const user of users) {
        await createSession(user.userId, user.projectId);
      }

      // Verify session.save was called for each user
      expect(mockSession.save).toHaveBeenCalledTimes(users.length);
    });
  });

  describe('validateSession', () => {
    it('should return session data when valid session exists', async () => {
      mockSession.userId = 'user-123';
      mockSession.activeProjectId = 'project-456';

      const result = await validateSession();

      expect(result).toEqual({
        userId: 'user-123',
        activeProjectId: 'project-456',
      });
    });

    it('should return null when no userId in session', async () => {
      mockSession.userId = undefined;
      mockSession.activeProjectId = 'project-456';

      const result = await validateSession();

      expect(result).toBeNull();
    });

    it('should handle session with null activeProjectId', async () => {
      mockSession.userId = 'user-123';
      mockSession.activeProjectId = null;

      const result = await validateSession();

      expect(result).toEqual({
        userId: 'user-123',
        activeProjectId: null,
      });
    });

    it('should return null for empty session', async () => {
      const result = await validateSession();

      expect(result).toBeNull();
    });
  });

  describe('destroySession', () => {
    it('should call session.destroy()', async () => {
      await destroySession();

      expect(mockSession.destroy).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', async () => {
      await destroySession();
      await destroySession();

      expect(mockSession.destroy).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateActiveProject', () => {
    it('should update activeProjectId in existing session', async () => {
      mockSession.userId = 'user-123';
      mockSession.activeProjectId = 'project-old';

      await updateActiveProject('project-new');

      expect(mockSession.activeProjectId).toBe('project-new');
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should throw error when no active session', async () => {
      mockSession.userId = undefined;

      await expect(updateActiveProject('project-123')).rejects.toThrow('No active session');
    });

    it('should handle switching between multiple projects', async () => {
      mockSession.userId = 'user-123';
      const projects = ['project-1', 'project-2', 'project-3'];

      for (const projectId of projects) {
        await updateActiveProject(projectId);
        expect(mockSession.activeProjectId).toBe(projectId);
      }

      expect(mockSession.save).toHaveBeenCalledTimes(projects.length);
    });
  });
});
