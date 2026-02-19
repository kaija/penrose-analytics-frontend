/**
 * Unit tests for session management utilities
 *
 * Requirements: 2.6, 2.7, 2.8, 2.9, 15.2, 15.3, 15.4, 15.5
 */

import {
  createSession,
  validateSession,
  destroySession,
  updateActiveProject,
  createAccessSimulationSession,
  exitAccessSimulation
} from '@/lib/session';
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

  describe('createAccessSimulationSession', () => {
    it('should create access simulation session with all required fields', async () => {
      const superAdminUserId = 'admin-123';
      const projectId = 'project-456';

      await createAccessSimulationSession(superAdminUserId, projectId);

      // Verify all session fields are set correctly
      expect(mockSession.originalUserId).toBe(superAdminUserId);
      expect(mockSession.superAdminMode).toBe(true);
      expect(mockSession.simulatedProjectId).toBe(projectId);
      expect(mockSession.activeProjectId).toBe(projectId);
      expect(mockSession.userId).toBe(superAdminUserId);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should preserve super admin user ID in originalUserId', async () => {
      const superAdminUserId = 'admin-999';
      const projectId = 'project-123';

      await createAccessSimulationSession(superAdminUserId, projectId);

      expect(mockSession.originalUserId).toBe(superAdminUserId);
      expect(mockSession.userId).toBe(superAdminUserId);
    });

    it('should set superAdminMode flag to true', async () => {
      const superAdminUserId = 'admin-123';
      const projectId = 'project-456';

      await createAccessSimulationSession(superAdminUserId, projectId);

      expect(mockSession.superAdminMode).toBe(true);
    });

    it('should set both simulatedProjectId and activeProjectId to target project', async () => {
      const superAdminUserId = 'admin-123';
      const projectId = 'project-789';

      await createAccessSimulationSession(superAdminUserId, projectId);

      expect(mockSession.simulatedProjectId).toBe(projectId);
      expect(mockSession.activeProjectId).toBe(projectId);
    });

    it('should handle multiple access simulation sessions', async () => {
      const simulations = [
        { adminId: 'admin-1', projectId: 'project-1' },
        { adminId: 'admin-2', projectId: 'project-2' },
        { adminId: 'admin-3', projectId: 'project-3' },
      ];

      for (const sim of simulations) {
        await createAccessSimulationSession(sim.adminId, sim.projectId);

        expect(mockSession.originalUserId).toBe(sim.adminId);
        expect(mockSession.simulatedProjectId).toBe(sim.projectId);
        expect(mockSession.superAdminMode).toBe(true);
      }

      expect(mockSession.save).toHaveBeenCalledTimes(simulations.length);
    });
  });

  describe('exitAccessSimulation', () => {
    it('should restore original session state when exiting access simulation', async () => {
      // Set up a session in access simulation mode
      mockSession.userId = 'admin-123';
      mockSession.originalUserId = 'admin-123';
      mockSession.superAdminMode = true;
      mockSession.simulatedProjectId = 'project-456';
      mockSession.activeProjectId = 'project-456';

      await exitAccessSimulation();

      // Verify simulation flags are cleared
      expect(mockSession.activeProjectId).toBeNull();
      expect(mockSession.superAdminMode).toBeUndefined();
      expect(mockSession.originalUserId).toBeUndefined();
      expect(mockSession.simulatedProjectId).toBeUndefined();
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should not modify session when not in super admin mode', async () => {
      // Set up a regular session (not in access simulation mode)
      mockSession.userId = 'user-123';
      mockSession.activeProjectId = 'project-456';
      mockSession.superAdminMode = undefined;
      mockSession.originalUserId = undefined;

      await exitAccessSimulation();

      // Verify session remains unchanged
      expect(mockSession.userId).toBe('user-123');
      expect(mockSession.activeProjectId).toBe('project-456');
      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('should not modify session when superAdminMode is true but originalUserId is missing', async () => {
      // Set up an invalid simulation state
      mockSession.userId = 'admin-123';
      mockSession.superAdminMode = true;
      mockSession.originalUserId = undefined;
      mockSession.activeProjectId = 'project-456';

      await exitAccessSimulation();

      // Verify session remains unchanged
      expect(mockSession.superAdminMode).toBe(true);
      expect(mockSession.activeProjectId).toBe('project-456');
      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('should handle round-trip: create simulation then exit', async () => {
      const superAdminUserId = 'admin-789';
      const projectId = 'project-999';

      // Create access simulation session
      await createAccessSimulationSession(superAdminUserId, projectId);

      // Verify simulation is active
      expect(mockSession.superAdminMode).toBe(true);
      expect(mockSession.originalUserId).toBe(superAdminUserId);
      expect(mockSession.simulatedProjectId).toBe(projectId);
      expect(mockSession.activeProjectId).toBe(projectId);

      // Exit access simulation
      await exitAccessSimulation();

      // Verify simulation is cleared
      expect(mockSession.activeProjectId).toBeNull();
      expect(mockSession.superAdminMode).toBeUndefined();
      expect(mockSession.originalUserId).toBeUndefined();
      expect(mockSession.simulatedProjectId).toBeUndefined();

      // Verify save was called twice (once for create, once for exit)
      expect(mockSession.save).toHaveBeenCalledTimes(2);
    });

    it('should clear activeProjectId to null, not undefined', async () => {
      // Set up a session in access simulation mode
      mockSession.userId = 'admin-123';
      mockSession.originalUserId = 'admin-123';
      mockSession.superAdminMode = true;
      mockSession.simulatedProjectId = 'project-456';
      mockSession.activeProjectId = 'project-456';

      await exitAccessSimulation();

      // Verify activeProjectId is explicitly set to null
      expect(mockSession.activeProjectId).toBeNull();
      expect(mockSession.activeProjectId).not.toBeUndefined();
    });

    it('should handle multiple exit calls safely', async () => {
      // Set up a session in access simulation mode
      mockSession.userId = 'admin-123';
      mockSession.originalUserId = 'admin-123';
      mockSession.superAdminMode = true;
      mockSession.simulatedProjectId = 'project-456';
      mockSession.activeProjectId = 'project-456';

      // First exit
      await exitAccessSimulation();
      expect(mockSession.save).toHaveBeenCalledTimes(1);

      // Second exit (should be a no-op)
      await exitAccessSimulation();
      expect(mockSession.save).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});
