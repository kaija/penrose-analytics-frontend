/**
 * Profile API Routes Tests
 * 
 * Tests for profile operations via API routes
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { NextRequest } from 'next/server';
import { POST as upsertProfileRoute, GET as searchProfilesRoute } from '@/app/api/projects/[id]/profiles/route';
import { GET as getProfileRoute } from '@/app/api/profiles/[id]/route';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    profile: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    projectMembership: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Profile API Routes', () => {
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile = {
    id: 'profile-123',
    projectId: 'project-123',
    externalId: 'user-ext-123',
    traits: { name: 'John Doe', email: 'john@example.com' },
    identities: { email: 'john@example.com' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent = {
    id: 'event-123',
    projectId: 'project-123',
    profileId: 'profile-123',
    eventName: 'page_view',
    payload: { url: '/home' },
    timestamp: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/profiles', () => {
    it('should upsert profile with viewer permissions', async () => {
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

      // Mock profile upsert
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({
          externalId: 'user-ext-123',
          traits: { name: 'John Doe', email: 'john@example.com' },
        }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(201);
      expect(data.data.externalId).toBe('user-ext-123');
      expect(data.data.traits.name).toBe('John Doe');
      expect(data.data.projectId).toBe('project-123');
    });

    it('should reject profile upsert without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({
          externalId: 'user-ext-123',
          traits: { name: 'John Doe' },
        }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should validate required externalId field', async () => {
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

      // Create request without externalId
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({ traits: { name: 'John Doe' } }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.fields?.externalId).toBeDefined();
    });

    it('should validate required traits field', async () => {
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

      // Create request without traits
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({ externalId: 'user-ext-123' }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.fields?.traits).toBeDefined();
    });

    it('should validate externalId length constraints', async () => {
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

      // Create request with externalId too long
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({
          externalId: 'a'.repeat(256),
          traits: { name: 'John Doe' },
        }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
    });

    it('should validate traits is an object', async () => {
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

      // Create request with traits as array
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({
          externalId: 'user-ext-123',
          traits: ['invalid'],
        }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.message).toContain('traits must be an object');
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
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'POST',
        body: JSON.stringify({
          externalId: 'user-ext-123',
          traits: { name: 'John Doe' },
        }),
      });

      // Execute
      const response = await upsertProfileRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('GET /api/projects/[id]/profiles', () => {
    it('should search profiles with viewer permissions', async () => {
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

      // Mock profile count and search
      (prisma.profile.count as jest.Mock).mockResolvedValue(2);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([
        mockProfile,
        { ...mockProfile, id: 'profile-456', externalId: 'user-ext-456' },
      ]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.profiles).toHaveLength(2);
      expect(data.data.total).toBe(2);
      expect(data.data.page).toBe(1);
      expect(data.data.pageSize).toBe(20);
    });

    it('should search profiles with search parameter', async () => {
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

      // Mock profile count and search
      (prisma.profile.count as jest.Mock).mockResolvedValue(1);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([mockProfile]);

      // Create request with search parameter
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles?search=john', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.profiles).toHaveLength(1);
      expect(data.data.total).toBe(1);
    });

    it('should search profiles with externalId parameter', async () => {
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

      // Mock profile count and search
      (prisma.profile.count as jest.Mock).mockResolvedValue(1);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([mockProfile]);

      // Create request with externalId parameter
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles?externalId=user-ext-123', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.profiles).toHaveLength(1);
    });

    it('should support pagination', async () => {
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

      // Mock profile count and search
      (prisma.profile.count as jest.Mock).mockResolvedValue(50);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([mockProfile]);

      // Create request with pagination
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles?page=2&pageSize=10', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.page).toBe(2);
      expect(data.data.pageSize).toBe(10);
      expect(data.data.total).toBe(50);
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should validate page parameter', async () => {
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

      // Create request with invalid page
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles?page=0', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.message).toContain('page must be greater than 0');
    });

    it('should validate pageSize parameter', async () => {
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

      // Create request with invalid pageSize
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles?pageSize=101', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('ValidationError');
      expect(data.error.message).toContain('pageSize must be between 1 and 100');
    });

    it('should return empty array when no profiles exist', async () => {
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

      // Mock empty profiles
      (prisma.profile.count as jest.Mock).mockResolvedValue(0);
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.profiles).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should reject search without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
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
      const request = new NextRequest('http://localhost/api/projects/project-123/profiles', {
        method: 'GET',
      });

      // Execute
      const response = await searchProfilesRoute(request, {
        params: { id: 'project-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });
  });

  describe('GET /api/profiles/[id]', () => {
    it('should get profile with events with viewer permissions', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock profile exists (for permission check)
      (prisma.profile.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce({
          ...mockProfile,
          events: [mockEvent],
        });

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
      const request = new NextRequest('http://localhost/api/profiles/profile-123', {
        method: 'GET',
      });

      // Execute
      const response = await getProfileRoute(request, {
        params: { id: 'profile-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.data.id).toBe('profile-123');
      expect(data.data.externalId).toBe('user-ext-123');
      expect(data.data.events).toHaveLength(1);
      expect(data.data.events[0].eventName).toBe('page_view');
    });

    it('should reject get profile without authentication', async () => {
      // Mock no session
      (validateSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/profiles/profile-123', {
        method: 'GET',
      });

      // Execute
      const response = await getProfileRoute(request, {
        params: { id: 'profile-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AuthenticationError');
    });

    it('should return 404 for non-existent profile', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock profile not found
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/profiles/profile-123', {
        method: 'GET',
      });

      // Execute
      const response = await getProfileRoute(request, {
        params: { id: 'profile-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NotFoundError');
    });

    it('should enforce profile:read permission', async () => {
      // Mock session
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      // Mock profile exists
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      // Mock user has no membership (no access)
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // Create request
      const request = new NextRequest('http://localhost/api/profiles/profile-123', {
        method: 'GET',
      });

      // Execute
      const response = await getProfileRoute(request, {
        params: { id: 'profile-123' },
      });

      const data = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AuthorizationError');
    });
  });
});
