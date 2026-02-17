import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/projects/[id]/id-hierarchy/route';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/session';
import { enforcePermission } from '@/lib/rbac';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    idHierarchy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/session');
jest.mock('@/lib/rbac');

describe('ID Hierarchy API', () => {
  const mockSession = {
    userId: 'user-1',
    activeProjectId: 'project-1',
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    enabled: true,
  };

  const mockIdHierarchy = [
    {
      id: 'id-1',
      projectId: 'project-1',
      displayName: 'User UUID',
      codeName: 'pid',
      priority: 0,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'id-2',
      projectId: 'project-1',
      displayName: 'Email',
      codeName: 'email',
      priority: 1,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (validateSession as jest.Mock).mockResolvedValue(mockSession);
    (enforcePermission as jest.Mock).mockResolvedValue(undefined);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
  });

  describe('GET /api/projects/[id]/id-hierarchy', () => {
    it('should return id hierarchy for authorized user', async () => {
      (prisma.idHierarchy.findMany as jest.Mock).mockResolvedValue(mockIdHierarchy);

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy');
      const response = await GET(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockIdHierarchy);
      expect(prisma.idHierarchy.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { priority: 'asc' },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (validateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy');
      const response = await GET(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy');
      const response = await GET(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/[id]/id-hierarchy', () => {
    it('should create new identity', async () => {
      (prisma.idHierarchy.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.idHierarchy.findFirst as jest.Mock).mockResolvedValue({ priority: 1 });
      (prisma.idHierarchy.create as jest.Mock).mockResolvedValue({
        id: 'id-3',
        projectId: 'project-1',
        displayName: 'Phone Number',
        codeName: 'phone',
        priority: 2,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Phone Number',
          codeName: 'phone',
          isCustom: false,
        }),
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.codeName).toBe('phone');
      expect(data.data.priority).toBe(2);
    });

    it('should reject invalid code name', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Invalid',
          codeName: 'Invalid-Name',
          isCustom: true,
        }),
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('pattern');
    });

    it('should reject duplicate code name', async () => {
      (prisma.idHierarchy.findUnique as jest.Mock).mockResolvedValue(mockIdHierarchy[0]);

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'User UUID',
          codeName: 'pid',
          isCustom: false,
        }),
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('already exists');
    });
  });

  describe('PUT /api/projects/[id]/id-hierarchy', () => {
    it('should update priorities', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.idHierarchy.findMany as jest.Mock).mockResolvedValue(mockIdHierarchy);

      const request = new NextRequest('http://localhost/api/projects/project-1/id-hierarchy', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { id: 'id-2', priority: 0 },
            { id: 'id-1', priority: 1 },
          ],
        }),
      });

      const response = await PUT(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(data.data).toEqual(mockIdHierarchy);
    });
  });

  describe('DELETE /api/projects/[id]/id-hierarchy', () => {
    it('should delete identity', async () => {
      (prisma.idHierarchy.delete as jest.Mock).mockResolvedValue(mockIdHierarchy[0]);

      const request = new NextRequest(
        'http://localhost/api/projects/project-1/id-hierarchy?itemId=id-1',
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
      expect(prisma.idHierarchy.delete).toHaveBeenCalledWith({
        where: { id: 'id-1' },
      });
    });

    it('should return 400 if itemId is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/projects/project-1/id-hierarchy',
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { 
        params: Promise.resolve({ id: 'project-1' }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('required');
    });
  });
});
