/**
 * ID Mapping Utility
 * 
 * High-performance ID resolution system for mapping various identifier types
 * (email, IDFA, session, cookie, device_id) to unified profile IDs.
 */

import { prisma } from './prisma';

export type IdType = 
  | 'email'
  | 'idfa'
  | 'idfv'
  | 'gaid'
  | 'session'
  | 'cookie'
  | 'device_id'
  | 'phone'
  | 'user_id'
  | 'anonymous_id';

export interface IdMappingInput {
  projectId: string;
  idType: IdType | string;
  idValue: string;
  profileId: string;
  expiresAt?: Date;
}

/**
 * Create or update an ID mapping
 * Uses upsert for idempotency
 */
export async function createIdMapping(input: IdMappingInput) {
  return await prisma.idMapping.upsert({
    where: {
      projectId_idType_idValue: {
        projectId: input.projectId,
        idType: input.idType,
        idValue: input.idValue,
      },
    },
    update: {
      profileId: input.profileId,
      expiresAt: input.expiresAt,
    },
    create: {
      projectId: input.projectId,
      idType: input.idType,
      idValue: input.idValue,
      profileId: input.profileId,
      expiresAt: input.expiresAt,
    },
  });
}

/**
 * Resolve an ID to a profile ID
 * Returns null if not found or expired
 */
export async function resolveId(
  projectId: string,
  idType: IdType | string,
  idValue: string
): Promise<string | null> {
  const mapping = await prisma.idMapping.findUnique({
    where: {
      projectId_idType_idValue: {
        projectId,
        idType,
        idValue,
      },
    },
    select: {
      profileId: true,
      expiresAt: true,
    },
  });

  if (!mapping) return null;

  // Check if expired
  if (mapping.expiresAt && mapping.expiresAt < new Date()) {
    // Optionally delete expired mapping
    await deleteIdMapping(projectId, idType, idValue);
    return null;
  }

  return mapping.profileId;
}

/**
 * Get all ID mappings for a profile
 */
export async function getProfileIdMappings(
  projectId: string,
  profileId: string
) {
  return await prisma.idMapping.findMany({
    where: {
      projectId,
      profileId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Delete a specific ID mapping
 */
export async function deleteIdMapping(
  projectId: string,
  idType: IdType | string,
  idValue: string
) {
  return await prisma.idMapping.delete({
    where: {
      projectId_idType_idValue: {
        projectId,
        idType,
        idValue,
      },
    },
  });
}

/**
 * Delete all ID mappings for a profile
 */
export async function deleteProfileIdMappings(
  projectId: string,
  profileId: string
) {
  return await prisma.idMapping.deleteMany({
    where: {
      projectId,
      profileId,
    },
  });
}

/**
 * Clean up expired ID mappings
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredIdMappings(projectId?: string) {
  const where: any = {
    expiresAt: {
      lt: new Date(),
    },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const result = await prisma.idMapping.deleteMany({
    where,
  });

  return result.count;
}

/**
 * Batch create ID mappings
 * Useful for bulk imports or identity stitching
 */
export async function batchCreateIdMappings(mappings: IdMappingInput[]) {
  const operations = mappings.map(mapping =>
    prisma.idMapping.upsert({
      where: {
        projectId_idType_idValue: {
          projectId: mapping.projectId,
          idType: mapping.idType,
          idValue: mapping.idValue,
        },
      },
      update: {
        profileId: mapping.profileId,
        expiresAt: mapping.expiresAt,
      },
      create: {
        projectId: mapping.projectId,
        idType: mapping.idType,
        idValue: mapping.idValue,
        profileId: mapping.profileId,
        expiresAt: mapping.expiresAt,
      },
    })
  );

  return await prisma.$transaction(operations);
}

/**
 * Get ID mapping statistics for a project
 */
export async function getIdMappingStats(projectId: string) {
  const [total, byType, expired] = await Promise.all([
    // Total mappings
    prisma.idMapping.count({
      where: { projectId },
    }),
    
    // Count by type
    prisma.idMapping.groupBy({
      by: ['idType'],
      where: { projectId },
      _count: true,
    }),
    
    // Expired count
    prisma.idMapping.count({
      where: {
        projectId,
        expiresAt: {
          lt: new Date(),
        },
      },
    }),
  ]);

  return {
    total,
    byType: byType.map(item => ({
      idType: item.idType,
      count: item._count,
    })),
    expired,
  };
}

/**
 * Helper: Create session ID mapping with expiration
 * Default: 30 days
 */
export async function createSessionMapping(
  projectId: string,
  sessionId: string,
  profileId: string,
  expirationDays: number = 30
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return await createIdMapping({
    projectId,
    idType: 'session',
    idValue: sessionId,
    profileId,
    expiresAt,
  });
}

/**
 * Helper: Create cookie ID mapping with expiration
 * Default: 365 days
 */
export async function createCookieMapping(
  projectId: string,
  cookieId: string,
  profileId: string,
  expirationDays: number = 365
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return await createIdMapping({
    projectId,
    idType: 'cookie',
    idValue: cookieId,
    profileId,
    expiresAt,
  });
}

/**
 * Helper: Create permanent ID mapping (email, phone, user_id)
 * No expiration
 */
export async function createPermanentMapping(
  projectId: string,
  idType: 'email' | 'phone' | 'user_id',
  idValue: string,
  profileId: string
) {
  return await createIdMapping({
    projectId,
    idType,
    idValue,
    profileId,
  });
}
