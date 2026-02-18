import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[id]/segments/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';
import { AuthorizationError } from '@/lib/errors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    segment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

describe('Segments API - GET & POST /api/projects/[id]/segments', () => {
  const mockSession = {
    userId: 'user-1',
    activeProjectId: 'project-1',
  };

  const mockSegments = [
    {
      id: 'seg-1',
      projectId: 'project-1',
      name: 'Active Users',
      description: 'Users active in last 7 days',
      filterConfig: { filters: [], timeRange: { from: '2024-01-01', to: '2024-01-31' } },
      createdBy: 'user-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: 'seg-2',
      projectId: 'project-1',
      name: 'Power Users',
      description: null,
      filterConfig: { filters: [], timeRange: { from: '2024-01-01', to: '2024-01-31' } },
      createdBy: 'user-1',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue(mockSession);
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/projects/[id]/segments', () => {
    it('should return segments ordered by updatedAt desc', async () => {
      (prisma.segment.findMany as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.segments).toHaveLength(2);
      expect(data.data.segments[0].name).toBe('Active Users');
      expect(data.data.segments[1].name).toBe('Power Users');
      expect(prisma.segment.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      (enforcePermission as jest.Mock).mockRejectedValue(
        new AuthorizationError()
      );

      const request = new NextRequest('http://localhost/api/projects/project-1/segments');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/projects/[id]/segments', () => {
    const validBody = {
      name: 'New Segment',
      description: 'A test segment',
      filterConfig: {
        filters: [],
        timeRange: { from: '2024-01-01', to: '2024-01-31' },
      },
    };

    it('should create a segment with valid data', async () => {
      const createdSegment = {
        id: 'seg-3',
        projectId: 'project-1',
        ...validBody,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.segment.create as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('New Segment');
      expect(prisma.segment.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          name: 'New Segment',
          description: 'A test segment',
          filterConfig: validBody.filterConfig,
          createdBy: 'user-1',
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      (enforcePermission as jest.Mock).mockRejectedValue(
        new AuthorizationError()
      );

      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 400 when name is missing', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify({ filterConfig: validBody.filterConfig }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when name is empty string', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify({ name: '', filterConfig: validBody.filterConfig }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify({
          name: 'a'.repeat(201),
          filterConfig: validBody.filterConfig,
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when filterConfig is missing', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when filterConfig is not an object', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', filterConfig: 'invalid' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 409 when segment name already exists in project', async () => {
      const prismaError = new Error('Unique constraint failed');
      Object.defineProperty(prismaError, 'constructor', {
        value: { name: 'PrismaClientKnownRequestError' },
      });
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['projectId', 'name'] };
      (prisma.segment.create as jest.Mock).mockRejectedValue(prismaError);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });

      expect(response.status).toBe(409);
    });

    it('should create segment without description', async () => {
      const bodyWithoutDesc = {
        name: 'No Desc Segment',
        filterConfig: validBody.filterConfig,
      };
      const createdSegment = {
        id: 'seg-4',
        projectId: 'project-1',
        ...bodyWithoutDesc,
        description: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.segment.create as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost/api/projects/project-1/segments', {
        method: 'POST',
        body: JSON.stringify(bodyWithoutDesc),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'project-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.description).toBeNull();
    });
  });
});
