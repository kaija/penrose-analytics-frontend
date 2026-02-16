/**
 * Report API Routes Tests
 * 
 * Tests for report CRUD operations via API routes
 * 
 * Requirements: 8.7, 8.8
 */

import { NextRequest } from 'next/server';
import { POST as createReportRoute, GET as listReportsRoute } from '@/app/api/projects/[id]/reports/route';
import { PUT as updateReportRoute, DELETE as deleteReportRoute } from '@/app/api/reports/[id]/route';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    report: {
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

describe('Report API Routes', () => {
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReport = {
    id: 'report-123',
    projectId: 'project-123',
    name: 'Test Report',
    category: 'trends',
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/reports', () => {
    it('should create report with editor permissions', async () => {
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

      // Mock report creation
      (prisma.report.create as jest.Mock).mockResolvedValue(mockReport);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report', category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Test Report');
      expect(data.data.category).toBe('trends');
      expect(data.data.projectId).toBe('project-123');
    });

    it('should reject report creation with viewer permissions', async () => {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report', category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });

    it('should reject report creation without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report', category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.fields?.name).toBeDefined();
    });

    it('should validate required category field', async () => {
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

      // Create request without category
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.fields?.category).toBeDefined();
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(101), category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should validate category length constraints', async () => {
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

      // Create request with category too long
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report', category: 'a'.repeat(51) }),
      });

      // Execute
      const response = await createReportRoute(request, {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Report', category: 'trends' }),
      });

      // Execute
      const response = await createReportRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('GET /api/projects/[id]/reports', () => {
    it('should list reports with viewer permissions', async () => {
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

      // Mock reports
      (prisma.report.findMany as jest.Mock).mockResolvedValue([
        { ...mockReport, name: 'Report 1' },
        { ...mockReport, id: 'report-456', name: 'Report 2', category: 'cohorts' },
      ]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'GET',
      });

      // Execute
      const response = await listReportsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Report 1');
      expect(data.data[1].category).toBe('cohorts');
    });

    it('should return empty array when no reports exist', async () => {
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

      // Mock empty reports
      (prisma.report.findMany as jest.Mock).mockResolvedValue([]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'GET',
      });

      // Execute
      const response = await listReportsRoute(request, {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'GET',
      });

      // Execute
      const response = await listReportsRoute(request, {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/reports', {
        method: 'GET',
      });

      // Execute
      const response = await listReportsRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('PUT /api/reports/[id]', () => {
    it('should update report with editor permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report update
      (prisma.report.update as jest.Mock).mockResolvedValue({
        ...mockReport,
        name: 'Updated Report',
      });

      // Create request
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Report' }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Report');
    });

    it('should update report category', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report update
      (prisma.report.update as jest.Mock).mockResolvedValue({
        ...mockReport,
        category: 'retention',
      });

      // Create request
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ category: 'retention' }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.category).toBe('retention');
    });

    it('should reject update with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

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
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Report' }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
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

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

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
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should validate category length on update', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create request with category too long
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ category: 'a'.repeat(51) }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should return 404 for non-existent report', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report not found
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Report' }),
      });

      // Execute
      const response = await updateReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('DELETE /api/reports/[id]', () => {
    it('should delete report with editor permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

      // Mock user has editor role
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        userId: 'user-123',
        projectId: 'project-123',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report delete
      (prisma.report.delete as jest.Mock).mockResolvedValue(mockReport);

      // Create request
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Report deleted successfully');
      expect(prisma.report.delete).toHaveBeenCalledWith({
        where: { id: 'report-123' },
      });
    });

    it('should reject delete with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report exists
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

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
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
      expect(prisma.report.delete).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent report', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock report not found
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/reports/report-123', {
        method: 'DELETE',
      });

      // Execute
      const response = await deleteReportRoute(request, {
        params: { id: 'report-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
      expect(prisma.report.delete).not.toHaveBeenCalled();
    });
  });
});
