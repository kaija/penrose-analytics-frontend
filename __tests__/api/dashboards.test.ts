/**
 * Dashboard API Routes Tests
 * 
 * Tests for dashboard CRUD operations via API routes
 * 
 * Requirements: 7.1, 7.9, 7.10
 */

import { NextRequest } from 'next/server';
import { POST as createDashboardRoute, GET as listDashboardsRoute } from '@/app/api/projects/[id]/dashboards/route';
import { PUT as updateDashboardRoute, DELETE as deleteDashboardRoute } from '@/app/api/dashboards/[id]/route';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    dashboard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMembership: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Dashboard API Routes', () => {
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDashboard = {
    id: 'dashboard-123',
    projectId: 'project-123',
    name: 'Test Dashboard',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/dashboards', () => {
    it('should create dashboard with editor permissions', async () => {
      // Mock session with editor role
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock dashboard creation
      (prisma.dashboard.create as jest.Mock).mockResolvedValue(mockDashboard);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Dashboard' }),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Test Dashboard');
      expect(data.data.projectId).toBe('project-123');
    });

    it('should reject dashboard creation with viewer permissions', async () => {
      // Mock session with viewer role
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has viewer role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Dashboard' }),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should reject dashboard creation without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Dashboard' }),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should validate required name field', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request without name
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.fields?.name).toBeDefined();
    });

    it('should validate name length constraints', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request with name too long
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should return 404 for non-existent project', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project not found
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Dashboard' }),
      });

      // Execute
      const response = await createDashboardRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('GET /api/projects/[id]/dashboards', () => {
    it('should list dashboards with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has viewer role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock dashboards
      (prisma.dashboard.findMany as jest.Mock).mockResolvedValue([
        { ...mockDashboard, name: 'Dashboard 1' },
        { ...mockDashboard, id: 'dashboard-456', name: 'Dashboard 2' },
      ]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'GET',
      });

      // Execute
      const response = await listDashboardsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Dashboard 1');
    });

    it('should return empty array when no dashboards exist', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project exists
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      // Mock user has viewer role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock empty dashboards
      (prisma.dashboard.findMany as jest.Mock).mockResolvedValue([]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'GET',
      });

      // Execute
      const response = await listDashboardsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });

    it('should reject listing without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'GET',
      });

      // Execute
      const response = await listDashboardsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should return 404 for non-existent project', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock project not found
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/dashboards', {
        method: 'GET',
      });

      // Execute
      const response = await listDashboardsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('PUT /api/dashboards/[id]', () => {
    it('should update dashboard with editor permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard exists
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock dashboard update
      (prisma.dashboard.update as jest.Mock).mockResolvedValue({
        ...mockDashboard,
        name: 'Updated Dashboard',
      });

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Dashboard' }),
      });

      // Execute
      const response = await updateDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Dashboard');
    });

    it('should reject update with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard exists
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

      // Mock user has viewer role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Dashboard' }),
      });

      // Execute
      const response = await updateDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should validate name length on update', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard exists
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request with name too long
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });

      // Execute
      const response = await updateDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should return 404 for non-existent dashboard', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard not found
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Dashboard' }),
      });

      // Execute
      const response = await updateDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('DELETE /api/dashboards/[id]', () => {
    it('should delete dashboard with editor permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard exists
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock dashboard delete
      (prisma.dashboard.delete as jest.Mock).mockResolvedValue(mockDashboard);

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Dashboard deleted successfully');
      expect(prisma.dashboard.delete).toHaveBeenCalledWith({
        where: { id: 'dashboard-123' },
      });
    });

    it('should reject delete with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard exists
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(mockDashboard);

      // Mock user has viewer role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
      expect(prisma.dashboard.delete).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent dashboard', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock dashboard not found
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/dashboards/dashboard-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteDashboardRoute(request, {
        params: { id: 'dashboard-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
      expect(prisma.dashboard.delete).not.toHaveBeenCalled();
    });
  });
});
