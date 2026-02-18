import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/projects/[id]/segments/[segmentId]/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { AuthorizationError } from '@/lib/errors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    segment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

describe('Segments Detail API - /api/projects/[id]/segments/[segmentId]', () => {
  const mockSession = {
    userId: 'user-1',
    activeProjectId: 'project-1',
  };

  const mockSegment = {
    id: 'seg-1',
    projectId: 'project-1',
    name: 'Active Users',
    description: 'Users active in last 7 days',
    filterConfig: { filters: [], timeRange: { from: '2024-01-01', to: '2024-01-31' } },
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  };

  const makeParams = (id: string, segmentId: string) => ({
    params: Promise.resolve({ id, segmentId }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue(mockSession);
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/projects/[id]/segments/[segmentId]', () => {
    it('should return a segment by id', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1');
      const response = await GET(request, makeParams('project-1', 'seg-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('seg-1');
      expect(data.data.name).toBe('Active Users');
      expect(prisma.segment.findFirst).toHaveBeenCalledWith({
        where: { id: 'seg-1', projectId: 'project-1' },
      });
    });

    it('should return 404 when segment does not exist', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/nonexistent');
      const response = await GET(request, makeParams('project-1', 'nonexistent'));

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1');
      const response = await GET(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      (enforcePermission as jest.Mock).mockRejectedValue(new AuthorizationError());

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1');
      const response = await GET(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/projects/[id]/segments/[segmentId]', () => {
    it('should update a segment with valid data', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);
      const updatedSegment = { ...mockSegment, name: 'Updated Name' };
      (prisma.segment.update as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Name');
      expect(prisma.segment.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update description only', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);
      const updatedSegment = { ...mockSegment, description: 'New description' };
      (prisma.segment.update as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ description: 'New description' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.description).toBe('New description');
    });

    it('should update filterConfig only', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);
      const newConfig = { filters: [{ type: 'event' }], timeRange: { from: '2024-02-01', to: '2024-02-28' } };
      const updatedSegment = { ...mockSegment, filterConfig: newConfig };
      (prisma.segment.update as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ filterConfig: newConfig }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(200);
      expect(prisma.segment.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: { filterConfig: newConfig },
      });
    });

    it('should return 404 when segment does not exist', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PUT(request, makeParams('project-1', 'nonexistent'));

      expect(response.status).toBe(404);
    });

    it('should return 400 when name is empty string', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(400);
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'a'.repeat(201) }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(400);
    });

    it('should return 400 when filterConfig is not an object', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ filterConfig: 'invalid' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(400);
    });

    it('should return 409 when updated name conflicts with existing segment', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);
      const prismaError = new Error('Unique constraint failed');
      Object.defineProperty(prismaError, 'constructor', {
        value: { name: 'PrismaClientKnownRequestError' },
      });
      (prismaError as any).code = 'P2002';
      (prisma.segment.update as jest.Mock).mockRejectedValue(prismaError);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(409);
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      (enforcePermission as jest.Mock).mockRejectedValue(new AuthorizationError());

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PUT(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/projects/[id]/segments/[segmentId]', () => {
    it('should delete a segment successfully', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.segment.delete as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, makeParams('project-1', 'seg-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.message).toBe('Segment deleted successfully');
      expect(prisma.segment.delete).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
      });
    });

    it('should return 404 when segment does not exist', async () => {
      (prisma.segment.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, makeParams('project-1', 'nonexistent'));

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      (enforcePermission as jest.Mock).mockRejectedValue(new AuthorizationError());

      const request = new NextRequest('http://localhost/api/projects/project-1/segments/seg-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, makeParams('project-1', 'seg-1'));

      expect(response.status).toBe(403);
    });
  });
});
