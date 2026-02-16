/**
 * Event Module
 * 
 * Handles event tracking, storage, and querying operations.
 * Events represent user activity tracked within a project.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { prisma } from './prisma';
import { NotFoundError, ValidationError } from './errors';

/**
 * Event filters for querying
 */
export interface EventFilters {
  eventName?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Paginated events result
 */
export interface PaginatedEvents {
  events: Array<{
    id: string;
    projectId: string;
    profileId: string;
    eventName: string;
    payload: Record<string, any>;
    timestamp: Date;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Track a new event
 * 
 * @param projectId - The project ID
 * @param profileId - The profile ID
 * @param eventName - The name of the event
 * @param payload - The event payload data
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns The created event
 * 
 * Requirements: 11.1
 */
export async function trackEvent(
  projectId: string,
  profileId: string,
  eventName: string,
  payload: Record<string, any>,
  timestamp?: Date
): Promise<{
  id: string;
  projectId: string;
  profileId: string;
  eventName: string;
  payload: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}> {
  // Validate profile exists and belongs to project
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new NotFoundError('Profile');
  }

  if (profile.projectId !== projectId) {
    throw new ValidationError('Profile does not belong to this project');
  }

  // Create the event
  const event = await prisma.event.create({
    data: {
      projectId,
      profileId,
      eventName,
      payload,
      timestamp: timestamp || new Date(),
    },
  });

  return {
    id: event.id,
    projectId: event.projectId,
    profileId: event.profileId,
    eventName: event.eventName,
    payload: event.payload as Record<string, any>,
    timestamp: event.timestamp,
    createdAt: event.createdAt,
  };
}

/**
 * Get events for a project with filters and pagination
 * 
 * @param projectId - The project ID
 * @param filters - Optional filters (eventName, userId, date range)
 * @param pagination - Pagination parameters
 * @returns Paginated events
 * 
 * Requirements: 11.2, 11.5
 */
export async function getProjectEvents(
  projectId: string,
  filters: EventFilters = {},
  pagination: Pagination
): Promise<PaginatedEvents> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = {
    projectId,
  };

  if (filters.eventName) {
    where.eventName = filters.eventName;
  }

  if (filters.userId) {
    // Find profile by externalId (userId)
    const profile = await prisma.profile.findFirst({
      where: {
        projectId,
        externalId: filters.userId,
      },
    });

    if (profile) {
      where.profileId = profile.id;
    } else {
      // No profile found, return empty results
      return {
        events: [],
        total: 0,
        page,
        pageSize,
      };
    }
  }

  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      where.timestamp.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.timestamp.lte = filters.endDate;
    }
  }

  // Get total count
  const total = await prisma.event.count({ where });

  // Get events
  const events = await prisma.event.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    events: events.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      profileId: event.profileId,
      eventName: event.eventName,
      payload: event.payload as Record<string, any>,
      timestamp: event.timestamp,
      createdAt: event.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Get a single event by ID
 * 
 * @param eventId - The event ID
 * @returns The event or null if not found
 * 
 * Requirements: 11.4
 */
export async function getEventById(eventId: string): Promise<{
  id: string;
  projectId: string;
  profileId: string;
  eventName: string;
  payload: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
} | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return null;
  }

  return {
    id: event.id,
    projectId: event.projectId,
    profileId: event.profileId,
    eventName: event.eventName,
    payload: event.payload as Record<string, any>,
    timestamp: event.timestamp,
    createdAt: event.createdAt,
  };
}

/**
 * Get events for a specific profile
 * 
 * @param profileId - The profile ID
 * @param pagination - Pagination parameters
 * @returns Paginated events
 * 
 * Requirements: 10.5
 */
export async function getProfileEvents(
  profileId: string,
  pagination: Pagination
): Promise<PaginatedEvents> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  // Get profile to get projectId
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new NotFoundError('Profile');
  }

  // Get total count
  const total = await prisma.event.count({
    where: { profileId },
  });

  // Get events
  const events = await prisma.event.findMany({
    where: { profileId },
    orderBy: { timestamp: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    events: events.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      profileId: event.profileId,
      eventName: event.eventName,
      payload: event.payload as Record<string, any>,
      timestamp: event.timestamp,
      createdAt: event.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
