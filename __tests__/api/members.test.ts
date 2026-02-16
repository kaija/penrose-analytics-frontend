/**
 * Unit tests for Project Member Management API Routes
 * 
 * Tests GET /api/projects/[id]/members, PUT /api/projects/[id]/members/[memberId],
 * and DELETE /api/projects/[id]/members/[memberId]
 * 
 * Requirements: 17.1, 17.3, 17.4
 */

import { NextRequest } from 'next/server';
import { GET as listMembers } from '@/app/api/projects/[id]/members/route';
import { 
  PUT as updateMember, 
  DELETE as removeMember 
} from '@/app/api/projects/[id]/members/[memberId]/route';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    projectMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Project Member Management API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects/[id]/members - List Members', () => {
    it('should return all members for owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user is owner
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock members list
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            name: 'Owner User',
            avatar: null,
          },
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          projectId: 'project-123',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-2',
            email: 'admin@example.com',
            name: 'Admin User',
            avatar: null,
          },
        },
      ];

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(mockMembers);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].user.email).toBe('owner@example.com');
      expect(data.data[1].user.email).toBe('admin@example.com');
    });

    it('should return all members for admin', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user is admin
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock members list
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            name: 'Owner User',
            avatar: null,
          },
        },
      ];

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(mockMembers);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('should return 403 if user is editor', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user is editor
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should return 403 if user is viewer', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user is viewer
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should return 404 if project not found', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project not found
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });

    it('should return 403 if user is not a member', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user is not a member
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/members');

      // Execute
      const response = await listMembers(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });
  });

  describe('PUT /api/projects/[id]/members/[memberId] - Update Member Role', () => {
    it('should update member role as owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to update (admin -> editor)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is owner
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'owner-123',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Mock update
      (prisma.projectMembership.update as jest.Mock).mockResolvedValue({
        id: 'membership-456',
        userId: 'user-456',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'editor' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Member role updated successfully');
      expect(prisma.projectMembership.update).toHaveBeenCalledWith({
        where: { id: 'membership-456' },
        data: { role: 'editor' },
      });
    });

    it('should return 403 if user is admin', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'admin-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to update
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is admin
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'admin-123',
          projectId: 'project-123',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'viewer' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
      expect(data.error.message).toContain('Only owners can update member roles');
    });

    it('should return 400 if trying to modify owner role', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to update (owner)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is owner
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'owner-123',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'admin' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.message).toContain('Cannot modify owner role');
    });

    it('should return 400 if role is missing', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Create request without role
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({}),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should return 404 if role is invalid', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Create request with invalid role
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'superadmin' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });

    it('should return 404 if membership not found', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership not found
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'editor' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'PUT',
          body: JSON.stringify({ role: 'editor' }),
        }
      );

      // Execute
      const response = await updateMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });
  });

  describe('DELETE /api/projects/[id]/members/[memberId] - Remove Member', () => {
    it('should remove member as owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to remove (editor)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is owner
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'owner-123',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Mock delete
      (prisma.projectMembership.delete as jest.Mock).mockResolvedValue({
        id: 'membership-456',
        userId: 'user-456',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Member removed successfully');
      expect(prisma.projectMembership.delete).toHaveBeenCalledWith({
        where: { id: 'membership-456' },
      });
    });

    it('should remove member as admin', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'admin-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to remove (editor)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is admin
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'admin-123',
          projectId: 'project-123',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Mock delete
      (prisma.projectMembership.delete as jest.Mock).mockResolvedValue({
        id: 'membership-456',
        userId: 'user-456',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Member removed successfully');
    });

    it('should return 403 if admin tries to remove owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'admin-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to remove (owner)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is admin
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'admin-123',
          projectId: 'project-123',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
      expect(data.error.message).toContain('Admins cannot remove owners');
    });

    it('should return 400 if trying to remove last owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to remove (owner)
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'owner-123',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is owner
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'owner-123',
          projectId: 'project-123',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Mock only one owner
      (prisma.projectMembership.count as jest.Mock).mockResolvedValue(1);

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-123',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-123' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.message).toContain('Cannot remove the last owner');
    });

    it('should return 403 if user is editor', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'editor-123',
        activeProjectId: 'project-123',
      });

      // Mock membership to remove
      (prisma.projectMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'membership-456',
          userId: 'user-456',
          projectId: 'project-123',
          role: 'viewer',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Mock requesting user is editor
        .mockResolvedValueOnce({
          id: 'membership-123',
          userId: 'editor-123',
          projectId: 'project-123',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
      expect(data.error.message).toContain('Only owners and admins can remove members');
    });

    it('should return 404 if membership not found', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'owner-123',
        activeProjectId: 'project-123',
      });

      // Mock membership not found
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest(
        'http://localhost/api/projects/project-123/members/membership-456',
        {
          method: 'DELETE',
        }
      );

      // Execute
      const response = await removeMember(request, {
        params: { id: 'project-123', memberId: 'membership-456' },
      });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });
  });
});
