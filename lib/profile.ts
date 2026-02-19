/**
 * Profile Management Module
 *
 * Handles customer profile operations including:
 * - Creating and updating profiles
 * - Searching profiles
 * - Retrieving profile details with events
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { prisma } from './prisma';
import { NotFoundError } from './errors';
import { Prisma } from '@prisma/client';

/**
 * Profile interface matching Prisma model
 */
export interface Profile {
  id: string;
  projectId: string;
  externalId: string;
  traits: Prisma.JsonValue;
  identities: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile with events interface
 */
export interface ProfileWithEvents extends Profile {
  events: Array<{
    id: string;
    eventName: string;
    payload: Prisma.JsonValue;
    timestamp: Date;
    createdAt: Date;
  }>;
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Paginated profiles response
 */
export interface PaginatedProfiles {
  profiles: Profile[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Profile search filters
 */
export interface ProfileSearchFilters {
  search?: string;
  externalId?: string;
}

/**
 * Create or update a profile (upsert)
 *
 * @param projectId - The project ID
 * @param externalId - The external identifier for the profile
 * @param traits - Profile attributes/traits
 * @returns The created or updated profile
 *
 * Requirements: 10.1, 10.2
 */
export async function upsertProfile(
  projectId: string,
  externalId: string,
  traits: Record<string, any>
): Promise<Profile> {
  const profile = await prisma.profile.upsert({
    where: {
      projectId_externalId: {
        projectId,
        externalId,
      },
    },
    update: {
      traits,
      updatedAt: new Date(),
    },
    create: {
      projectId,
      externalId,
      traits,
      identities: {},
    },
  });

  return profile;
}

/**
 * Search profiles in a project
 *
 * @param projectId - The project ID
 * @param filters - Search filters
 * @param pagination - Pagination parameters
 * @returns Paginated profiles
 *
 * Requirements: 10.3, 10.7
 */
export async function searchProfiles(
  projectId: string,
  filters: ProfileSearchFilters = {},
  pagination: Pagination = { page: 1, pageSize: 20 }
): Promise<PaginatedProfiles> {
  const { search, externalId } = filters;
  const { page, pageSize } = pagination;

  // Build where clause
  const where: any = {
    projectId,
  };

  if (externalId) {
    where.externalId = {
      contains: externalId,
      mode: 'insensitive',
    };
  }

  // If search is provided, search in externalId
  if (search && !externalId) {
    where.externalId = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Get total count
  const total = await prisma.profile.count({ where });

  // Get profiles with pagination
  const profiles = await prisma.profile.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    profiles,
    total,
    page,
    pageSize,
  };
}

/**
 * Get a profile by ID
 *
 * @param profileId - The profile ID
 * @returns The profile or null if not found
 *
 * Requirements: 10.4
 */
export async function getProfile(profileId: string): Promise<Profile | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  return profile;
}

/**
 * Get a profile with its events
 *
 * @param profileId - The profile ID
 * @returns The profile with events
 * @throws NotFoundError if profile not found
 *
 * Requirements: 10.4, 10.5
 */
export async function getProfileWithEvents(
  profileId: string
): Promise<ProfileWithEvents> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      events: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 100, // Limit to last 100 events
      },
    },
  });

  if (!profile) {
    throw new NotFoundError('Profile');
  }

  return profile;
}
