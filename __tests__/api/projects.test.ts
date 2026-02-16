/**
 * Unit tests for Project API Routes
 * 
 * Tests POST /api/projects, GET /api/projects, PUT /api/projects/[id], 
 * and POST /api/projects/[id]/switch
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { NextRequest } from 'next/server';
import { POST as createProject, GET as listProjects } from '@/app/api/projects/route';
import { PUT as updateProject } from '@/app/api/projects/[id]/route';
import { POST as switchProject } from '@/app/api/projects/[id]/switch/route';
import { validateSession, updateActiveProject } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectMembership: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Project API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects - Create Project', () => {
    it('should create a project and assign creator as owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: null,
      });

      // Mock transaction
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
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
              id: 'membership-123',
              userId: 'user-123',
              projectId: 'project-123',
              role: 'owner',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        });
      });

      // Create request
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      });

      // Execute
      const response = await createProject(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(201);
      expect(data.data.id).toBe(mockProject.id);
      expect(data.data.name).toBe(mockProject.name);
      expect(data.data.enabled).toBe(mockProject.enabled);
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      });

      // Execute
      const response = await createProject(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should return 400 if name is missing', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: null,
      });

      // Create request without name
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Execute
      const response = await createProject(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should return 400 if name is too long', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: null,
      });

      // Create request with long name
      const longName = 'a'.repeat(101);
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: longName }),
      });

      // Execute
      const response = await createProject(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });
  });

  describe('GET /api/projects - List Projects', () => {
    it('should return all projects for authenticated user', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-1',
      });

      // Mock projects
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue(
        mockProjects.map((project, index) => ({
          id: `membership-${index}`,
          userId: 'user-123',
          projectId: project.id,
          role: 'owner',
          project,
        }))
      );

      // Create request
      const request = new NextRequest('http://localhost/api/projects');

      // Execute
      const response = await listProjects(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Project 1');
      expect(data.data[1].name).toBe('Project 2');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects');

      // Execute
      const response = await listProjects(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should return empty array if user has no projects', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: null,
      });

      // Mock no projects
      (prisma.projectMembership.findMany as jest.Mock).mockResolvedValue([]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects');

      // Execute
      const response = await listProjects(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });
  });

  describe('PUT /api/projects/[id] - Update Project', () => {
    it('should update project name as owner', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Old Name',
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

      // Mock update
      const updatedProject = {
        id: 'project-123',
        name: 'New Name',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });

      // Execute
      const response = await updateProject(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.name).toBe('New Name');
    });

    it('should update project name as admin', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-123',
        name: 'Old Name',
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

      // Mock update
      const updatedProject = {
        id: 'project-123',
        name: 'New Name',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });

      // Execute
      const response = await updateProject(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.name).toBe('New Name');
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
        name: 'Old Name',
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
      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });

      // Execute
      const response = await updateProject(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
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
      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });

      // Execute
      const response = await updateProject(request, { params: { id: 'project-123' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('POST /api/projects/[id]/switch - Switch Project', () => {
    it('should switch active project', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-old',
      });

      // Mock user has access to new project
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-new',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock updateActiveProject
      (updateActiveProject as jest.Mock).mockResolvedValue(undefined);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-new/switch', {
        method: 'POST',
      });

      // Execute
      const response = await switchProject(request, { params: { id: 'project-new' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.activeProjectId).toBe('project-new');
      expect(updateActiveProject).toHaveBeenCalledWith('project-new');
    });

    it('should return 403 if user does not have access', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-old',
      });

      // Mock user does not have access
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-new/switch', {
        method: 'POST',
      });

      // Execute
      const response = await switchProject(request, { params: { id: 'project-new' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-new/switch', {
        method: 'POST',
      });

      // Execute
      const response = await switchProject(request, { params: { id: 'project-new' } });
      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });
  });
});
