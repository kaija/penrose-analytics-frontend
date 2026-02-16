/**
 * Unit tests for project management operations
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import {
  createProject,
  getUserProjects,
  switchProject,
  hasProjectAccess,
  getUserRole,
  getProjectMembers,
  updateMemberRole,
  removeProjectMember,
} from '@/lib/project';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    project: {
      create: jest.fn(),
    },
    projectMembership: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create project and assign creator as owner', async () => {
      const userId = 'user-123';
      const projectName = 'Test Project';
      const mockProject = {
        id: 'project-123',
        name: projectName,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock transaction to execute callback
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
          },
          projectMembership: {
            create: jest.fn().mockResolvedValue({
              id: 'membership-123',
              userId,
              projectId: mockProject.id,
              role: 'owner',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        });
      });

      const result = await createProject(userId, projectName);

      expect(result).toEqual(mockProject);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle project creation with special characters in name', async () => {
      const userId = 'user-123';
      const projectName = 'Test & Project (2024)';
      const mockProject = {
        id: 'project-456',
        name: projectName,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
          },
          projectMembership: {
            create: jest.fn().mockResolvedValue({
              id: 'membership-456',
              userId,
              projectId: mockProject.id,
              role: 'owner',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        });
      });

      const result = await createProject(userId, projectName);

      expect(result.name).toBe(projectName);
    });
  });

  describe('getUserProjects', () => {
    it('should return all projects for a user', async () => {
      const userId = 'user-123';
      const mockMemberships = [
        {
          id: 'membership-1',
          userId,
          projectId: 'project-1',
          role: 'owner' as Role,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'project-1',
            name: 'Project 1',
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: 'membership-2',
          userId,
          projectId: 'project-2',
          role: 'admin' as Role,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'project-2',
            name: 'Project 2',
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(mockMemberships);

      const result = await getUserProjects(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project-1');
      expect(result[1].id).toBe('project-2');
      expect(prisma.projectMembership.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { project: true },
      });
    });

    it('should return empty array for user with no projects', async () => {
      const userId = 'user-no-projects';

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUserProjects(userId);

      expect(result).toEqual([]);
    });

    it('should return projects with different roles', async () => {
      const userId = 'user-123';
      const roles: Role[] = ['owner', 'admin', 'editor', 'viewer'];
      const mockMemberships = roles.map((role, index) => ({
        id: `membership-${index}`,
        userId,
        projectId: `project-${index}`,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          id: `project-${index}`,
          name: `Project ${index}`,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }));

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(mockMemberships);

      const result = await getUserProjects(userId);

      expect(result).toHaveLength(4);
    });
  });

  describe('switchProject', () => {
    it('should allow switching to project with access', async () => {
      const userId = 'user-123';
      const projectId = 'project-456';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId,
        projectId,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(switchProject(userId, projectId)).resolves.not.toThrow();
    });

    it('should throw error when switching to project without access', async () => {
      const userId = 'user-123';
      const projectId = 'project-no-access';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(switchProject(userId, projectId)).rejects.toThrow(
        'You do not have access to this project'
      );
    });
  });

  describe('hasProjectAccess', () => {
    it('should return true when user has access', async () => {
      const userId = 'user-123';
      const projectId = 'project-456';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId,
        projectId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasProjectAccess(userId, projectId);

      expect(result).toBe(true);
      expect(prisma.projectMembership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
      });
    });

    it('should return false when user has no access', async () => {
      const userId = 'user-123';
      const projectId = 'project-no-access';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await hasProjectAccess(userId, projectId);

      expect(result).toBe(false);
    });

    it('should handle multiple access checks', async () => {
      const userId = 'user-123';
      const projects = [
        { id: 'project-1', hasAccess: true },
        { id: 'project-2', hasAccess: false },
        { id: 'project-3', hasAccess: true },
      ];

      for (const project of projects) {
        (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(
          project.hasAccess
            ? {
                id: `membership-${project.id}`,
                userId,
                projectId: project.id,
                role: 'editor',
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : null
        );

        const result = await hasProjectAccess(userId, project.id);
        expect(result).toBe(project.hasAccess);
      }
    });
  });

  describe('getUserRole', () => {
    it('should return user role when membership exists', async () => {
      const userId = 'user-123';
      const projectId = 'project-456';
      const role: Role = 'admin';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId,
        projectId,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserRole(userId, projectId);

      expect(result).toBe(role);
    });

    it('should return null when user is not a member', async () => {
      const userId = 'user-123';
      const projectId = 'project-no-access';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserRole(userId, projectId);

      expect(result).toBeNull();
    });

    it('should return correct role for each role type', async () => {
      const userId = 'user-123';
      const roles: Role[] = ['owner', 'admin', 'editor', 'viewer'];

      for (const role of roles) {
        (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
          id: `membership-${role}`,
          userId,
          projectId: `project-${role}`,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await getUserRole(userId, `project-${role}`);
        expect(result).toBe(role);
      }
    });
  });

  describe('getProjectMembers', () => {
    it('should return all members with user details', async () => {
      const projectId = 'project-123';
      const mockMemberships = [
        {
          id: 'membership-1',
          userId: 'user-1',
          projectId,
          role: 'owner' as Role,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            name: 'Owner User',
            avatar: 'https://example.com/avatar1.jpg',
          },
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          projectId,
          role: 'admin' as Role,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          user: {
            id: 'user-2',
            email: 'admin@example.com',
            name: 'Admin User',
            avatar: null,
          },
        },
      ];

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(mockMemberships);

      const result = await getProjectMembers(projectId);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe('owner@example.com');
      expect(result[1].user.email).toBe('admin@example.com');
      expect(prisma.projectMembership.findMany).toHaveBeenCalledWith({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });

    it('should return empty array for project with no members', async () => {
      const projectId = 'project-empty';

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getProjectMembers(projectId);

      expect(result).toEqual([]);
    });
  });

  describe('updateMemberRole', () => {
    it('should allow owner to update member role', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'membership-123';
      const newRole: Role = 'admin';

      const mockMembership = {
        id: membershipId,
        userId: 'target-user',
        projectId: 'project-123',
        role: 'editor' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-owner',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      (prisma.projectMembership.update as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: newRole,
      });

      await updateMemberRole(requestingUserId, membershipId, newRole);

      expect(prisma.projectMembership.update).toHaveBeenCalledWith({
        where: { id: membershipId },
        data: { role: newRole },
      });
    });

    it('should throw error when non-owner tries to update role', async () => {
      const requestingUserId = 'admin-user';
      const membershipId = 'membership-123';
      const newRole: Role = 'viewer';

      const mockMembership = {
        id: membershipId,
        userId: 'target-user',
        projectId: 'project-123',
        role: 'editor' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-admin',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'admin' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      await expect(updateMemberRole(requestingUserId, membershipId, newRole)).rejects.toThrow(
        'Only owners can update member roles'
      );
    });

    it('should throw error when trying to modify owner role', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'membership-owner-target';
      const newRole: Role = 'admin';

      const mockMembership = {
        id: membershipId,
        userId: 'target-owner',
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-owner',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      await expect(updateMemberRole(requestingUserId, membershipId, newRole)).rejects.toThrow(
        'Cannot modify owner role'
      );
    });

    it('should throw error when membership not found', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'nonexistent';
      const newRole: Role = 'admin';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateMemberRole(requestingUserId, membershipId, newRole)).rejects.toThrow(
        'Membership not found'
      );
    });
  });

  describe('removeProjectMember', () => {
    it('should allow owner to remove non-owner member', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'membership-123';

      const mockMembership = {
        id: membershipId,
        userId: 'target-user',
        projectId: 'project-123',
        role: 'editor' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-owner',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      (prisma.projectMembership.delete as jest.Mock).mockResolvedValue(mockMembership);

      await removeProjectMember(requestingUserId, membershipId);

      expect(prisma.projectMembership.delete).toHaveBeenCalledWith({
        where: { id: membershipId },
      });
    });

    it('should allow admin to remove non-owner member', async () => {
      const requestingUserId = 'admin-user';
      const membershipId = 'membership-123';

      const mockMembership = {
        id: membershipId,
        userId: 'target-user',
        projectId: 'project-123',
        role: 'viewer' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-admin',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'admin' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      (prisma.projectMembership.delete as jest.Mock).mockResolvedValue(mockMembership);

      await removeProjectMember(requestingUserId, membershipId);

      expect(prisma.projectMembership.delete).toHaveBeenCalled();
    });

    it('should throw error when admin tries to remove owner', async () => {
      const requestingUserId = 'admin-user';
      const membershipId = 'membership-owner';

      const mockMembership = {
        id: membershipId,
        userId: 'owner-user',
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-admin',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'admin' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      await expect(removeProjectMember(requestingUserId, membershipId)).rejects.toThrow(
        'Admins cannot remove owners'
      );
    });

    it('should throw error when trying to remove last owner', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'membership-owner';

      const mockMembership = {
        id: membershipId,
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-owner',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      (prisma.projectMembership.count as jest.Mock).mockResolvedValue(1);

      await expect(removeProjectMember(requestingUserId, membershipId)).rejects.toThrow(
        'Cannot remove the last owner from the project'
      );
    });

    it('should allow removing owner when multiple owners exist', async () => {
      const requestingUserId = 'owner-user-1';
      const membershipId = 'membership-owner-2';

      const mockMembership = {
        id: membershipId,
        userId: 'owner-user-2',
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-owner-1',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'owner' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      (prisma.projectMembership.count as jest.Mock).mockResolvedValue(2);
      (prisma.projectMembership.delete as jest.Mock).mockResolvedValue(mockMembership);

      await removeProjectMember(requestingUserId, membershipId);

      expect(prisma.projectMembership.delete).toHaveBeenCalled();
    });

    it('should throw error when editor tries to remove member', async () => {
      const requestingUserId = 'editor-user';
      const membershipId = 'membership-123';

      const mockMembership = {
        id: membershipId,
        userId: 'target-user',
        projectId: 'project-123',
        role: 'viewer' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequestingMembership = {
        id: 'membership-editor',
        userId: requestingUserId,
        projectId: 'project-123',
        role: 'editor' as Role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockRequestingMembership);

      await expect(removeProjectMember(requestingUserId, membershipId)).rejects.toThrow(
        'Only owners and admins can remove members'
      );
    });

    it('should throw error when membership not found', async () => {
      const requestingUserId = 'owner-user';
      const membershipId = 'nonexistent';

      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(removeProjectMember(requestingUserId, membershipId)).rejects.toThrow(
        'Membership not found'
      );
    });
  });
});
