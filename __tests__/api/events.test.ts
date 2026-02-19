/**
 * Event API Routes Tests
 *
 * Tests for event tracking and querying via API routes
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { NextRequest } from 'next/server';
import { POST as trackEventRoute, GET as listEventsRoute } from '@/app/api/projects/[id]/events/route';
import { GET as getEventRoute } from '@/app/api/events/[id]/route';
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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    projectMembership: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Event API Routes', () => {
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
    traits: { name: 'John Doe' },
    identities: { email: 'john@example.com' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent = {
    id: 'event-123',
    projectId: 'project-123',
    profileId: 'profile-123',
    eventName: 'page_view',
    payload: { url: '/home', title: 'Home Page' },
    timestamp: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/events', () => {
    it('should track event with viewer permissions', async () => {
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

      // Mock profile exists
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      // Create request
      const request = new NextRequest('http://localhost/api/projects/project-123/events', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'profile-123',
          eventName: 'page_view',
          payload: { url: '/home', title: 'Home Page' },
        }),
      });

      // Execute
      const response = await trackEventRoute(request, {
        params: { id: 'project-123' },
      });

      // Assert
      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.data.eventName).toBe('page_view');
      expect(result.data.payload).toEqual({ url: '/home', title: 'Home Page' });
    });

    it('should track event with custom timestamp', async () => {
      const customTimestamp = new Date('2024-01-10T15:30:00Z');

      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        ...mockEvent,
        timestamp: customTimestamp,
      });

      const request = new NextRequest('http://localhost/api/projects/project-123/events', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'profile-123',
          eventName: 'button_click',
          payload: { button: 'submit' },
          timestamp: customTimestamp.toISOString(),
        }),
      });

      const response = await trackEventRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.data.timestamp).toBe(customTimestamp.toISOString());
    });

    it('should reject event tracking without authentication', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-123/events', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'profile-123',
          eventName: 'page_view',
          payload: {},
        }),
      });

      const response = await trackEventRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject event tracking for non-existent project', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-999/events', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'profile-123',
          eventName: 'page_view',
          payload: {},
        }),
      });

      const response = await trackEventRoute(request, {
        params: { id: 'project-999' },
      });

      expect(response.status).toBe(404);
    });

    it('should reject event tracking with missing required fields', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      const request = new NextRequest('http://localhost/api/projects/project-123/events', {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'page_view',
          // Missing profileId and payload
        }),
      });

      const response = await trackEventRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(400);
    });

    it('should reject event tracking with invalid payload type', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      const request = new NextRequest('http://localhost/api/projects/project-123/events', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'profile-123',
          eventName: 'page_view',
          payload: 'invalid', // Should be an object
        }),
      });

      const response = await trackEventRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.message).toContain('payload must be an object');
    });
  });

  describe('GET /api/projects/[id]/events', () => {
    it('should list events with viewer permissions', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      (prisma.event.count as jest.Mock).mockResolvedValue(1);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const request = new NextRequest('http://localhost/api/projects/project-123/events');

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0].eventName).toBe('page_view');
      expect(result.data.total).toBe(1);
    });

    it('should filter events by event name', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      (prisma.event.count as jest.Mock).mockResolvedValue(1);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/projects/project-123/events?eventName=page_view'
      );

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventName: 'page_view',
          }),
        })
      );
    });

    it('should filter events by user ID', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      // Mock profile lookup by externalId
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue(mockProfile);

      (prisma.event.count as jest.Mock).mockResolvedValue(1);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/projects/project-123/events?userId=user-ext-123'
      );

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(200);
      expect(prisma.profile.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          externalId: 'user-ext-123',
        },
      });
    });

    it('should filter events by date range', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      (prisma.event.count as jest.Mock).mockResolvedValue(1);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      const request = new NextRequest(
        `http://localhost/api/projects/project-123/events?startDate=${startDate}&endDate=${endDate}`
      );

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        })
      );
    });

    it('should support pagination', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      (prisma.event.count as jest.Mock).mockResolvedValue(50);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/projects/project-123/events?page=2&pageSize=10'
      );

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * pageSize 10
          take: 10,
        })
      );
    });

    it('should reject invalid pagination parameters', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      const request = new NextRequest(
        'http://localhost/api/projects/project-123/events?page=0'
      );

      const response = await listEventsRoute(request, {
        params: { id: 'project-123' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events/[id]', () => {
    it('should get event details with viewer permissions', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue({
        role: 'viewer',
      });

      const request = new NextRequest('http://localhost/api/events/event-123');

      const response = await getEventRoute(request, {
        params: { id: 'event-123' },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.id).toBe('event-123');
      expect(result.data.eventName).toBe('page_view');
      expect(result.data.payload).toEqual({ url: '/home', title: 'Home Page' });
    });

    it('should reject request for non-existent event', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        activeProjectId: 'project-123',
      });

      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/events/event-999');

      const response = await getEventRoute(request, {
        params: { id: 'event-999' },
      });

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/events/event-123');

      const response = await getEventRoute(request, {
        params: { id: 'event-123' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request without proper permissions', async () => {
      (validateSession as jest.Mock).mockResolvedValue({
        userId: 'user-456',
        activeProjectId: 'project-456',
      });

      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);

      // User is not a member of the project
      (prisma.projectMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/events/event-123');

      const response = await getEventRoute(request, {
        params: { id: 'event-123' },
      });

      expect(response.status).toBe(403);
    });
  });
});
