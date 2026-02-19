/**
 * ID Mapping Tests
 */

import { prisma } from '@/lib/prisma';
import {
  createIdMapping,
  resolveId,
  getProfileIdMappings,
  deleteIdMapping,
  cleanupExpiredIdMappings,
  batchCreateIdMappings,
  getIdMappingStats,
  createSessionMapping,
  createCookieMapping,
  createPermanentMapping,
} from '@/lib/id-mapping';

describe('ID Mapping', () => {
  let testProjectId: string;
  let testProfileId: string;

  beforeEach(async () => {
    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });
    testProjectId = project.id;

    // Create test profile
    const profile = await prisma.profile.create({
      data: {
        projectId: testProjectId,
        externalId: 'test-user-123',
        traits: {},
        identities: {},
      },
    });
    testProfileId = profile.id;
  });

  afterEach(async () => {
    // Clean up
    await prisma.idMapping.deleteMany({
      where: { projectId: testProjectId },
    });
    await prisma.profile.deleteMany({
      where: { projectId: testProjectId },
    });
    await prisma.project.delete({
      where: { id: testProjectId },
    });
  });

  describe('createIdMapping', () => {
    it('should create a new ID mapping', async () => {
      const mapping = await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: testProfileId,
      });

      expect(mapping).toBeDefined();
      expect(mapping.idType).toBe('email');
      expect(mapping.idValue).toBe('test@example.com');
      expect(mapping.profileId).toBe(testProfileId);
    });

    it('should upsert existing mapping', async () => {
      // Create initial mapping
      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: testProfileId,
      });

      // Create another profile
      const profile2 = await prisma.profile.create({
        data: {
          projectId: testProjectId,
          externalId: 'test-user-456',
          traits: {},
          identities: {},
        },
      });

      // Update mapping to new profile
      const updated = await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: profile2.id,
      });

      expect(updated.profileId).toBe(profile2.id);

      // Verify only one mapping exists
      const count = await prisma.idMapping.count({
        where: {
          projectId: testProjectId,
          idType: 'email',
          idValue: 'test@example.com',
        },
      });
      expect(count).toBe(1);

      await prisma.profile.delete({ where: { id: profile2.id } });
    });

    it('should create mapping with expiration', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const mapping = await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_abc123',
        profileId: testProfileId,
        expiresAt,
      });

      expect(mapping.expiresAt).toBeDefined();
      expect(mapping.expiresAt?.getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });
  });

  describe('resolveId', () => {
    it('should resolve existing ID to profile', async () => {
      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: testProfileId,
      });

      const resolved = await resolveId(testProjectId, 'email', 'test@example.com');
      expect(resolved).toBe(testProfileId);
    });

    it('should return null for non-existent ID', async () => {
      const resolved = await resolveId(testProjectId, 'email', 'nonexistent@example.com');
      expect(resolved).toBeNull();
    });

    it('should return null for expired ID', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_expired',
        profileId: testProfileId,
        expiresAt,
      });

      const resolved = await resolveId(testProjectId, 'session', 'sess_expired');
      expect(resolved).toBeNull();
    });
  });

  describe('getProfileIdMappings', () => {
    it('should get all mappings for a profile', async () => {
      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: testProfileId,
      });

      await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_123',
        profileId: testProfileId,
      });

      const mappings = await getProfileIdMappings(testProjectId, testProfileId);
      expect(mappings).toHaveLength(2);
      expect(mappings.map(m => m.idType)).toContain('email');
      expect(mappings.map(m => m.idType)).toContain('session');
    });
  });

  describe('deleteIdMapping', () => {
    it('should delete a specific mapping', async () => {
      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test@example.com',
        profileId: testProfileId,
      });

      await deleteIdMapping(testProjectId, 'email', 'test@example.com');

      const resolved = await resolveId(testProjectId, 'email', 'test@example.com');
      expect(resolved).toBeNull();
    });
  });

  describe('cleanupExpiredIdMappings', () => {
    it('should delete expired mappings', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_expired',
        profileId: testProfileId,
        expiresAt,
      });

      const deletedCount = await cleanupExpiredIdMappings(testProjectId);
      expect(deletedCount).toBe(1);

      const resolved = await resolveId(testProjectId, 'session', 'sess_expired');
      expect(resolved).toBeNull();
    });

    it('should not delete non-expired mappings', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_valid',
        profileId: testProfileId,
        expiresAt,
      });

      const deletedCount = await cleanupExpiredIdMappings(testProjectId);
      expect(deletedCount).toBe(0);

      const resolved = await resolveId(testProjectId, 'session', 'sess_valid');
      expect(resolved).toBe(testProfileId);
    });
  });

  describe('batchCreateIdMappings', () => {
    it('should create multiple mappings in a transaction', async () => {
      const mappings = await batchCreateIdMappings([
        {
          projectId: testProjectId,
          idType: 'email',
          idValue: 'user1@example.com',
          profileId: testProfileId,
        },
        {
          projectId: testProjectId,
          idType: 'phone',
          idValue: '+1234567890',
          profileId: testProfileId,
        },
      ]);

      expect(mappings).toHaveLength(2);

      const allMappings = await getProfileIdMappings(testProjectId, testProfileId);
      expect(allMappings).toHaveLength(2);
    });
  });

  describe('getIdMappingStats', () => {
    it('should return statistics', async () => {
      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test1@example.com',
        profileId: testProfileId,
      });

      await createIdMapping({
        projectId: testProjectId,
        idType: 'email',
        idValue: 'test2@example.com',
        profileId: testProfileId,
      });

      await createIdMapping({
        projectId: testProjectId,
        idType: 'session',
        idValue: 'sess_123',
        profileId: testProfileId,
      });

      const stats = await getIdMappingStats(testProjectId);
      expect(stats.total).toBe(3);
      expect(stats.byType).toHaveLength(2);
      
      const emailStat = stats.byType.find(s => s.idType === 'email');
      expect(emailStat?.count).toBe(2);
    });
  });

  describe('Helper Functions', () => {
    it('should create session mapping with default expiration', async () => {
      const mapping = await createSessionMapping(
        testProjectId,
        'sess_xyz',
        testProfileId
      );

      expect(mapping.expiresAt).toBeDefined();
      
      const daysUntilExpiry = Math.floor(
        (mapping.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBeGreaterThanOrEqual(29);
      expect(daysUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('should create cookie mapping with default expiration', async () => {
      const mapping = await createCookieMapping(
        testProjectId,
        'cookie_abc',
        testProfileId
      );

      expect(mapping.expiresAt).toBeDefined();
      
      const daysUntilExpiry = Math.floor(
        (mapping.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBeGreaterThanOrEqual(364);
      expect(daysUntilExpiry).toBeLessThanOrEqual(365);
    });

    it('should create permanent mapping without expiration', async () => {
      const mapping = await createPermanentMapping(
        testProjectId,
        'email',
        'permanent@example.com',
        testProfileId
      );

      expect(mapping.expiresAt).toBeNull();
    });
  });
});
