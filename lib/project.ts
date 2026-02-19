import { prisma } from './prisma';
import { Role } from '@prisma/client';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  createValidationError
} from './errors';

/**
 * Project interface matching Prisma model
 */
export interface Project {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new project and assign the creator as owner
 *
 * @param userId - The ID of the user creating the project
 * @param name - The name of the project
 * @returns The created project
 *
 * Requirements: 3.1, 3.2
 */
export async function createProject(userId: string, name: string): Promise<Project> {
  // Create project and membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the project
    const project = await tx.project.create({
      data: {
        name,
        enabled: true,
      },
    });

    // Create owner membership for the creator
    await tx.projectMembership.create({
      data: {
        userId,
        projectId: project.id,
        role: 'owner',
      },
    });

    return project;
  });

  return result;
}

/**
 * Get all projects for a user
 * Returns projects where the user has any membership
 *
 * @param userId - The ID of the user
 * @returns Array of projects the user has access to
 *
 * Requirements: 3.3
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const memberships = await prisma.projectMembership.findMany({
    where: {
      userId,
    },
    include: {
      project: true,
    },
  });

  return memberships.map((m) => m.project);
}

/**
 * Switch the active project for a user
 * Updates the session's activeProjectId
 *
 * Note: This function only validates access. The actual session update
 * is handled by the session module's updateActiveProject function.
 *
 * @param userId - The ID of the user
 * @param projectId - The ID of the project to switch to
 * @throws AuthorizationError if user doesn't have access to the project
 *
 * Requirements: 3.4, 19.3
 */
export async function switchProject(userId: string, projectId: string): Promise<void> {
  // Verify user has access to the project
  const hasAccess = await hasProjectAccess(userId, projectId);

  if (!hasAccess) {
    throw new AuthorizationError('You do not have access to this project');
  }

  // Access validation passed - caller should update session
}

/**
 * Check if a user has access to a project
 *
 * @param userId - The ID of the user
 * @param projectId - The ID of the project
 * @returns true if user has access, false otherwise
 *
 * Requirements: 3.4
 */
export async function hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  return membership !== null;
}

/**
 * Get the role of a user in a project
 *
 * @param userId - The ID of the user
 * @param projectId - The ID of the project
 * @returns The user's role in the project, or null if not a member
 *
 * Requirements: 3.4
 */
export async function getUserRole(userId: string, projectId: string): Promise<Role | null> {
  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  return membership?.role ?? null;
}

/**
 * ProjectMembership interface with user details
 */
export interface ProjectMembershipWithUser {
  id: string;
  userId: string;
  projectId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
}

/**
 * Get all members of a project
 *
 * @param projectId - The ID of the project
 * @returns Array of project memberships with user details
 *
 * Requirements: 17.1, 17.2
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMembershipWithUser[]> {
  const memberships = await prisma.projectMembership.findMany({
    where: {
      projectId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return memberships;
}

/**
 * Update a member's role in a project
 *
 * @param requestingUserId - The ID of the user making the request
 * @param membershipId - The ID of the membership to update
 * @param newRole - The new role to assign
 * @throws NotFoundError if membership not found
 * @throws AuthorizationError if requesting user doesn't have permission
 * @throws ValidationError if trying to modify an owner role
 *
 * Requirements: 17.3, 17.6, 19.3, 19.4
 */
export async function updateMemberRole(
  requestingUserId: string,
  membershipId: string,
  newRole: Role
): Promise<void> {
  // Get the membership to update
  const membership = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    throw new NotFoundError('Membership');
  }

  // Get the requesting user's role
  const requestingUserRole = await getUserRole(requestingUserId, membership.projectId);

  if (!requestingUserRole) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners can update roles
  if (requestingUserRole !== 'owner') {
    throw new AuthorizationError('Only owners can update member roles');
  }

  // Check if the target membership is an owner
  if (membership.role === 'owner') {
    throw new ValidationError('Cannot modify owner role');
  }

  // Update the role
  await prisma.projectMembership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });
}

/**
 * Remove a member from a project
 *
 * @param requestingUserId - The ID of the user making the request
 * @param membershipId - The ID of the membership to remove
 * @throws NotFoundError if membership not found
 * @throws AuthorizationError if requesting user doesn't have permission
 * @throws ValidationError if trying to remove the last owner
 *
 * Requirements: 17.4, 17.5, 17.6, 19.3, 19.4
 */
export async function removeProjectMember(
  requestingUserId: string,
  membershipId: string
): Promise<void> {
  // Get the membership to remove
  const membership = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    throw new NotFoundError('Membership');
  }

  // Get the requesting user's role
  const requestingUserRole = await getUserRole(requestingUserId, membership.projectId);

  if (!requestingUserRole) {
    throw new AuthorizationError('You are not a member of this project');
  }

  // Only owners and admins can remove members
  if (requestingUserRole !== 'owner' && requestingUserRole !== 'admin') {
    throw new AuthorizationError('Only owners and admins can remove members');
  }

  // Admins cannot remove owners
  if (requestingUserRole === 'admin' && membership.role === 'owner') {
    throw new AuthorizationError('Admins cannot remove owners');
  }

  // Check if this is the last owner
  if (membership.role === 'owner') {
    const ownerCount = await prisma.projectMembership.count({
      where: {
        projectId: membership.projectId,
        role: 'owner',
      },
    });

    if (ownerCount <= 1) {
      throw new ValidationError('Cannot remove the last owner from the project');
    }
  }

  // Remove the membership
  await prisma.projectMembership.delete({
    where: { id: membershipId },
  });
}
