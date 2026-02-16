/**
 * Property-based tests for invitation system
 * 
 * Feature: prism
 * Testing Framework: fast-check
 * 
 * IMPORTANT: Run invitation tests sequentially to avoid database conflicts:
 * npm test -- --runInBand __tests__/invitation/
 */

import * as fc from 'fast-check';
import { createInvitation, sendInvitationEmail, resendInvitation } from '@/lib/invitation';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { sendEmail } from '@/lib/email';

// Mock the email module
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

describe('Invitation System Property Tests', () => {
  // Track created entities for cleanup
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdMembershipIds: string[] = [];
  const createdInvitationIds: string[] = [];

  // Clean up test data after each test
  afterEach(async () => {
    // Delete in reverse order of creation, respecting foreign key constraints
    if (createdInvitationIds.length > 0) {
      await prisma.invitation.deleteMany({
        where: { id: { in: createdInvitationIds } },
      });
      createdInvitationIds.length = 0;
    }
    
    if (createdMembershipIds.length > 0) {
      await prisma.projectMembership.deleteMany({
        where: { id: { in: createdMembershipIds } },
      });
      createdMembershipIds.length = 0;
    }
    
    if (createdProjectIds.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } },
      });
      createdProjectIds.length = 0;
    }
    
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
    
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Property 11: Invitation Creation Invariants
   * 
   * For any invitation created by an owner or admin, the system must:
   * - Generate a unique token
   * - Set an expiration timestamp
   * - Store the projectId/invitedEmail/role
   * - Send an email containing the acceptance link with the token
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  test('Property 11: Invitation creation invariants', async () => {
    // Mock sendEmail to always succeed
    (sendEmail as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // project name
        fc.emailAddress(), // invited email
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role to assign
        fc.constantFrom('owner', 'admin'), // inviter role (only owner/admin can invite)
        fc.string({ minLength: 1, maxLength: 100 }), // inviter name
        async (projectName, invitedEmail, roleToAssign, inviterRole, inviterName) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `prop-inviter-${Date.now()}-${Math.random()}@example.com`,
              name: inviterName,
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: projectName,
            },
          });
          createdProjectIds.push(project.id);

          const membership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: inviterRole as Role,
            },
          });
          createdMembershipIds.push(membership.id);

          // Create invitation
          const invitation = await createInvitation(
            project.id,
            invitedEmail,
            roleToAssign as Role,
            inviter.id
          );
          createdInvitationIds.push(invitation.id);

          // Requirement 5.2: System must generate a unique token
          expect(invitation.token).toBeDefined();
          expect(typeof invitation.token).toBe('string');
          expect(invitation.token.length).toBeGreaterThan(0);
          // Token should be 64 hex characters (32 bytes)
          expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);

          // Verify token is unique by checking database
          const tokenCount = await prisma.invitation.count({
            where: { token: invitation.token },
          });
          expect(tokenCount).toBe(1);

          // Requirement 5.2: System must set an expiration timestamp
          expect(invitation.expiresAt).toBeDefined();
          expect(invitation.expiresAt).toBeInstanceOf(Date);
          // Expiration should be in the future
          expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
          // Expiration should be approximately 7 days from now
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const timeDiff = Math.abs(invitation.expiresAt.getTime() - sevenDaysFromNow.getTime());
          expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

          // Requirement 5.3: System must store projectId/invitedEmail/role
          expect(invitation.projectId).toBe(project.id);
          expect(invitation.invitedEmail).toBe(invitedEmail);
          expect(invitation.role).toBe(roleToAssign);

          // Verify invitation is stored in database
          const storedInvitation = await prisma.invitation.findUnique({
            where: { id: invitation.id },
          });
          expect(storedInvitation).toBeDefined();
          expect(storedInvitation?.projectId).toBe(project.id);
          expect(storedInvitation?.invitedEmail).toBe(invitedEmail);
          expect(storedInvitation?.role).toBe(roleToAssign);

          // Requirement 5.4: System must send an email containing the acceptance link with the token
          // Send the invitation email
          const emailResult = await sendInvitationEmail(
            invitation,
            project,
            inviter
          );

          // Verify sendEmail was called
          expect(sendEmail).toHaveBeenCalled();
          const emailCall = (sendEmail as jest.Mock).mock.calls[
            (sendEmail as jest.Mock).mock.calls.length - 1
          ][0];

          // Verify email recipient matches invitedEmail
          expect(emailCall.to).toBe(invitedEmail);

          // Verify email contains acceptance link with token
          const acceptanceLinkPattern = new RegExp(`/invite/accept\\?token=${invitation.token}`);
          expect(emailCall.text).toMatch(acceptanceLinkPattern);
          expect(emailCall.html).toMatch(acceptanceLinkPattern);

          // Verify email contains project name
          expect(emailCall.text).toContain(projectName);
          expect(emailCall.html).toContain(projectName);

          // Verify email contains inviter name
          expect(emailCall.text).toContain(inviterName);
          expect(emailCall.html).toContain(inviterName);

          // Verify email result indicates success
          expect(emailResult.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Token uniqueness across multiple invitations
   * 
   * For any sequence of invitation creations, all generated tokens must be unique.
   */
  test('Property: All invitation tokens are unique', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.emailAddress(), { minLength: 2, maxLength: 10 }), // multiple emails
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role
        async (emails, role) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `inviter-${Date.now()}-${Math.random()}@example.com`,
              name: 'Test Inviter',
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: 'Test Project',
            },
          });
          createdProjectIds.push(project.id);

          const membership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: 'owner',
            },
          });
          createdMembershipIds.push(membership.id);

          // Create multiple invitations
          const invitations = [];
          for (const email of emails) {
            const invitation = await createInvitation(
              project.id,
              email,
              role as Role,
              inviter.id
            );
            invitations.push(invitation);
            createdInvitationIds.push(invitation.id);
          }

          // Verify all tokens are unique
          const tokens = invitations.map(inv => inv.token);
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);

          // Verify all tokens are stored in database
          const storedInvitations = await prisma.invitation.findMany({
            where: { projectId: project.id },
          });
          expect(storedInvitations.length).toBe(invitations.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Invitation expiration is always in the future
   * 
   * For any invitation created, the expiresAt timestamp must be in the future.
   */
  test('Property: Invitation expiration is always in the future', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(), // invited email
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role
        async (invitedEmail, role) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `inviter-${Date.now()}-${Math.random()}@example.com`,
              name: 'Test Inviter',
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: 'Test Project',
            },
          });
          createdProjectIds.push(project.id);

          const membership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: 'owner',
            },
          });
          createdMembershipIds.push(membership.id);

          // Capture time before creation
          const beforeCreation = Date.now();

          // Create invitation
          const invitation = await createInvitation(
            project.id,
            invitedEmail,
            role as Role,
            inviter.id
          );
          createdInvitationIds.push(invitation.id);

          // Verify expiration is in the future
          expect(invitation.expiresAt.getTime()).toBeGreaterThan(beforeCreation);

          // Verify expiration is not too far in the future (should be ~7 days)
          const maxExpiration = beforeCreation + 8 * 24 * 60 * 60 * 1000; // 8 days
          expect(invitation.expiresAt.getTime()).toBeLessThan(maxExpiration);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Invitation stores all required fields
   * 
   * For any invitation created, all required fields must be present and valid.
   */
  test('Property: Invitation stores all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(), // invited email
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role
        async (invitedEmail, role) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `inviter-${Date.now()}-${Math.random()}@example.com`,
              name: 'Test Inviter',
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: 'Test Project',
            },
          });
          createdProjectIds.push(project.id);

          const membership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: 'owner',
            },
          });
          createdMembershipIds.push(membership.id);

          // Create invitation
          const invitation = await createInvitation(
            project.id,
            invitedEmail,
            role as Role,
            inviter.id
          );
          createdInvitationIds.push(invitation.id);

          // Verify all required fields are present
          expect(invitation.id).toBeDefined();
          expect(typeof invitation.id).toBe('string');

          expect(invitation.token).toBeDefined();
          expect(typeof invitation.token).toBe('string');

          expect(invitation.projectId).toBeDefined();
          expect(invitation.projectId).toBe(project.id);

          expect(invitation.invitedEmail).toBeDefined();
          expect(invitation.invitedEmail).toBe(invitedEmail);

          expect(invitation.role).toBeDefined();
          expect(invitation.role).toBe(role);

          expect(invitation.expiresAt).toBeDefined();
          expect(invitation.expiresAt).toBeInstanceOf(Date);

          expect(invitation.createdAt).toBeDefined();
          expect(invitation.createdAt).toBeInstanceOf(Date);

          // acceptedAt should be null for new invitations
          expect(invitation.acceptedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Successful Invitation Acceptance
   * 
   * For any valid invitation acceptance (matching email, not expired), the system must:
   * - Create a ProjectMembership with the specified role
   * - Mark the invitation's acceptedAt timestamp
   * 
   * **Validates: Requirements 5.7, 5.8**
   */
  test('Property 13: Successful invitation acceptance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(), // invited email (will match authenticated email)
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role to assign
        fc.string({ minLength: 1, maxLength: 100 }), // project name
        fc.string({ minLength: 1, maxLength: 100 }), // user name
        async (invitedEmail, role, projectName, userName) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `inviter-${Date.now()}-${Math.random()}@example.com`,
              name: 'Test Inviter',
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: projectName,
            },
          });
          createdProjectIds.push(project.id);

          const inviterMembership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: 'owner',
            },
          });
          createdMembershipIds.push(inviterMembership.id);

          // Create the user who will accept the invitation
          const invitedUser = await prisma.user.create({
            data: {
              email: invitedEmail,
              name: userName,
            },
          });
          createdUserIds.push(invitedUser.id);

          // Create invitation
          const invitation = await createInvitation(
            project.id,
            invitedEmail,
            role as Role,
            inviter.id
          );
          createdInvitationIds.push(invitation.id);

          // Verify invitation is valid and not expired
          expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
          expect(invitation.acceptedAt).toBeNull();

          // Import acceptInvitation function
          const { acceptInvitation } = await import('@/lib/invitation');

          // Accept the invitation with matching email
          const membership = await acceptInvitation(invitation.token, invitedEmail);
          createdMembershipIds.push(membership.id);

          // Requirement 5.7: System must create a ProjectMembership with the specified role
          expect(membership).toBeDefined();
          expect(membership.userId).toBe(invitedUser.id);
          expect(membership.projectId).toBe(project.id);
          expect(membership.role).toBe(role);

          // Verify membership exists in database
          const storedMembership = await prisma.projectMembership.findUnique({
            where: { id: membership.id },
          });
          expect(storedMembership).toBeDefined();
          expect(storedMembership?.userId).toBe(invitedUser.id);
          expect(storedMembership?.projectId).toBe(project.id);
          expect(storedMembership?.role).toBe(role);

          // Requirement 5.8: System must mark the invitation's acceptedAt timestamp
          const updatedInvitation = await prisma.invitation.findUnique({
            where: { id: invitation.id },
          });
          expect(updatedInvitation?.acceptedAt).not.toBeNull();
          expect(updatedInvitation?.acceptedAt).toBeInstanceOf(Date);
          
          // Verify acceptedAt is a recent timestamp (within last few seconds)
          const acceptedAtTime = updatedInvitation!.acceptedAt!.getTime();
          const now = Date.now();
          expect(acceptedAtTime).toBeLessThanOrEqual(now);
          expect(acceptedAtTime).toBeGreaterThan(now - 5000); // Within 5 seconds

          // Verify the invitation cannot be accepted again
          await expect(
            acceptInvitation(invitation.token, invitedEmail)
          ).rejects.toThrow(/invalid or expired/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Email Verification on Invitation Acceptance
   * 
   * For any invitation acceptance attempt, the system must verify that the
   * authenticated user's email exactly matches the invitedEmail field before
   * creating a ProjectMembership.
   * 
   * - If emails match, acceptance succeeds
   * - If emails don't match, acceptance fails with appropriate error
   * 
   * **Validates: Requirements 5.6**
   */
  test('Property 12: Email verification on invitation acceptance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(), // invited email
        fc.emailAddress(), // authenticated email (may or may not match)
        fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role
        async (invitedEmail, authEmail, role) => {
          // Setup: Create inviter user and project
          const inviter = await prisma.user.create({
            data: {
              email: `inviter-${Date.now()}-${Math.random()}@example.com`,
              name: 'Test Inviter',
            },
          });
          createdUserIds.push(inviter.id);

          const project = await prisma.project.create({
            data: {
              name: 'Test Project',
            },
          });
          createdProjectIds.push(project.id);

          const inviterMembership = await prisma.projectMembership.create({
            data: {
              userId: inviter.id,
              projectId: project.id,
              role: 'owner',
            },
          });
          createdMembershipIds.push(inviterMembership.id);

          // Create the user who will attempt to accept the invitation
          const authenticatedUser = await prisma.user.create({
            data: {
              email: authEmail,
              name: 'Authenticated User',
            },
          });
          createdUserIds.push(authenticatedUser.id);

          // Create invitation
          const invitation = await createInvitation(
            project.id,
            invitedEmail,
            role as Role,
            inviter.id
          );
          createdInvitationIds.push(invitation.id);

          // Import acceptInvitation function
          const { acceptInvitation } = await import('@/lib/invitation');

          if (invitedEmail === authEmail) {
            // Requirement 5.6: If emails match, acceptance should succeed
            const membership = await acceptInvitation(invitation.token, authEmail);
            createdMembershipIds.push(membership.id);

            // Verify ProjectMembership was created
            expect(membership).toBeDefined();
            expect(membership.userId).toBe(authenticatedUser.id);
            expect(membership.projectId).toBe(project.id);
            expect(membership.role).toBe(role);

            // Verify invitation was marked as accepted
            const updatedInvitation = await prisma.invitation.findUnique({
              where: { id: invitation.id },
            });
            expect(updatedInvitation?.acceptedAt).not.toBeNull();
            expect(updatedInvitation?.acceptedAt).toBeInstanceOf(Date);

            // Verify membership exists in database
            const storedMembership = await prisma.projectMembership.findUnique({
              where: { id: membership.id },
            });
            expect(storedMembership).toBeDefined();
            expect(storedMembership?.userId).toBe(authenticatedUser.id);
            expect(storedMembership?.projectId).toBe(project.id);
            expect(storedMembership?.role).toBe(role);
          } else {
            // Requirement 5.6: If emails don't match, acceptance should fail
            await expect(
              acceptInvitation(invitation.token, authEmail)
            ).rejects.toThrow(/different email address/i);

            // Verify no ProjectMembership was created
            const membership = await prisma.projectMembership.findFirst({
              where: {
                userId: authenticatedUser.id,
                projectId: project.id,
              },
            });
            expect(membership).toBeNull();

            // Verify invitation was NOT marked as accepted
            const updatedInvitation = await prisma.invitation.findUnique({
              where: { id: invitation.id },
            });
            expect(updatedInvitation?.acceptedAt).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 30: Invitation Email Content
 * 
 * For any invitation email sent, the email body must contain:
 * - The acceptance link with token
 * - The project name
 * - The inviter's name
 * 
 * **Validates: Requirements 16.3, 16.4**
 */
test('Property 30: Invitation email content', async () => {
  // Mock sendEmail to always succeed
  (sendEmail as jest.Mock).mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  });

  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }), // project name
      fc.emailAddress(), // invited email
      fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role to assign
      fc.string({ minLength: 1, maxLength: 100 }), // inviter name
      async (projectName, invitedEmail, roleToAssign, inviterName) => {
        // Setup: Create inviter user and project
        const inviter = await prisma.user.create({
          data: {
            email: `inviter-${Date.now()}-${Math.random()}@example.com`,
            name: inviterName,
          },
        });
        createdUserIds.push(inviter.id);

        const project = await prisma.project.create({
          data: {
            name: projectName,
          },
        });
        createdProjectIds.push(project.id);

        const membership = await prisma.projectMembership.create({
          data: {
            userId: inviter.id,
            projectId: project.id,
            role: 'owner',
          },
        });
        createdMembershipIds.push(membership.id);

        // Create invitation
        const invitation = await createInvitation(
          project.id,
          invitedEmail,
          roleToAssign as Role,
          inviter.id
        );
        createdInvitationIds.push(invitation.id);

        // Send the invitation email
        const emailResult = await sendInvitationEmail(
          invitation,
          project,
          inviter
        );

        // Verify email was sent successfully
        expect(emailResult.success).toBe(true);

        // Verify sendEmail was called
        expect(sendEmail).toHaveBeenCalled();
        const emailCall = (sendEmail as jest.Mock).mock.calls[
          (sendEmail as jest.Mock).mock.calls.length - 1
        ][0];

        // Requirement 16.3: Email body must contain the acceptance link with token
        const acceptanceLinkPattern = new RegExp(`/invite/accept\\?token=${invitation.token}`);
        expect(emailCall.text).toMatch(acceptanceLinkPattern);
        expect(emailCall.html).toMatch(acceptanceLinkPattern);

        // Verify the acceptance link is properly formatted
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const expectedLink = `${baseUrl}/invite/accept?token=${invitation.token}`;
        expect(emailCall.text).toContain(expectedLink);
        expect(emailCall.html).toContain(expectedLink);

        // Requirement 16.4: Email body must contain the project name
        expect(emailCall.text).toContain(projectName);
        expect(emailCall.html).toContain(projectName);

        // Requirement 16.4: Email body must contain the inviter's name
        expect(emailCall.text).toContain(inviterName);
        expect(emailCall.html).toContain(inviterName);

        // Additional verification: Email should be sent to the invited email
        expect(emailCall.to).toBe(invitedEmail);

        // Additional verification: Email should have a subject
        expect(emailCall.subject).toBeDefined();
        expect(emailCall.subject).toContain(projectName);
      }
    ),
    { numRuns: 100 }
  );
  });

  /**
   * Property 14: Invitation Resend Behavior
 *
 * For any invitation resend operation, the system must:
 * - Extend the expiresAt timestamp
 * - Send a new email with the same token
 *
 * **Validates: Requirements 5.10**
 */
test('Property 14: Invitation resend behavior', async () => {
  // Mock sendEmail to always succeed
  (sendEmail as jest.Mock).mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  });

  await fc.assert(
    fc.asyncProperty(
      fc.emailAddress(), // invited email
      fc.constantFrom('owner', 'admin', 'editor', 'viewer'), // role
      fc.string({ minLength: 1, maxLength: 100 }), // project name
      fc.string({ minLength: 1, maxLength: 100 }), // inviter name
      async (invitedEmail, role, projectName, inviterName) => {
        // Setup: Create inviter user and project
        const inviter = await prisma.user.create({
          data: {
            email: `inviter-${Date.now()}-${Math.random()}@example.com`,
            name: inviterName,
          },
        });
        createdUserIds.push(inviter.id);

        const project = await prisma.project.create({
          data: {
            name: projectName,
          },
        });
        createdProjectIds.push(project.id);

        const membership = await prisma.projectMembership.create({
          data: {
            userId: inviter.id,
            projectId: project.id,
            role: 'owner',
          },
        });
        createdMembershipIds.push(membership.id);

        // Create initial invitation
        const invitation = await createInvitation(
          project.id,
          invitedEmail,
          role as Role,
          inviter.id
        );
        createdInvitationIds.push(invitation.id);

        // Store the original token and expiration
        const originalToken = invitation.token;
        const originalExpiresAt = invitation.expiresAt;

        // Clear mock calls from initial invitation creation
        jest.clearAllMocks();

        // Wait a small amount of time to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        // Import resendInvitation function
        const { resendInvitation } = await import('@/lib/invitation');

        // Resend the invitation
        const emailResult = await resendInvitation(invitation.id);

        // Verify email was sent successfully
        expect(emailResult.success).toBe(true);

        // Fetch the updated invitation from database
        const updatedInvitation = await prisma.invitation.findUnique({
          where: { id: invitation.id },
        });

        expect(updatedInvitation).toBeDefined();

        // Requirement 5.10: System must extend the expiresAt timestamp
        expect(updatedInvitation!.expiresAt).toBeDefined();
        expect(updatedInvitation!.expiresAt).toBeInstanceOf(Date);

        // New expiration should be later than original expiration
        expect(updatedInvitation!.expiresAt.getTime()).toBeGreaterThan(originalExpiresAt.getTime());

        // New expiration should be approximately 7 days from now (not from original creation)
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const timeDiff = Math.abs(updatedInvitation!.expiresAt.getTime() - sevenDaysFromNow.getTime());
        expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

        // Requirement 5.10: System must send a new email with the same token
        // Verify the token remains unchanged
        expect(updatedInvitation!.token).toBe(originalToken);

        // Verify sendEmail was called
        expect(sendEmail).toHaveBeenCalledTimes(1);
        const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];

        // Verify email recipient matches invitedEmail
        expect(emailCall.to).toBe(invitedEmail);

        // Verify email contains acceptance link with the SAME token
        const acceptanceLinkPattern = new RegExp(`/invite/accept\\?token=${originalToken}`);
        expect(emailCall.text).toMatch(acceptanceLinkPattern);
        expect(emailCall.html).toMatch(acceptanceLinkPattern);

        // Verify email contains project name
        expect(emailCall.text).toContain(projectName);
        expect(emailCall.html).toContain(projectName);

        // Verify email contains inviter name
        expect(emailCall.text).toContain(inviterName);
        expect(emailCall.html).toContain(inviterName);

        // Verify the invitation has not been marked as accepted
        expect(updatedInvitation!.acceptedAt).toBeNull();

        // Verify the invitation can still be accepted with the same token
        const invitedUser = await prisma.user.create({
          data: {
            email: invitedEmail,
            name: 'Invited User',
          },
        });
        createdUserIds.push(invitedUser.id);

        const { acceptInvitation } = await import('@/lib/invitation');
        const acceptedMembership = await acceptInvitation(originalToken, invitedEmail);
        createdMembershipIds.push(acceptedMembership.id);

        expect(acceptedMembership).toBeDefined();
        expect(acceptedMembership.userId).toBe(invitedUser.id);
        expect(acceptedMembership.projectId).toBe(project.id);
        expect(acceptedMembership.role).toBe(role);
      }
    ),
    { numRuns: 100 }
  );
  });
});
