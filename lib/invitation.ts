import { prisma } from './prisma';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail, SendEmailResult } from './email';
import {
  NotFoundError,
  ValidationError,
  AuthenticationError
} from './errors';

/**
 * Invitation interface matching Prisma model
 */
export interface Invitation {
  id: string;
  token: string;
  projectId: string;
  invitedEmail: string;
  role: Role;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

/**
 * Project interface for invitation emails
 */
export interface Project {
  id: string;
  name: string;
}

/**
 * User interface for invitation emails
 */
export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Create a new invitation for a user to join a project
 *
 * Generates a unique token using crypto.randomBytes, sets expiration to 7 days,
 * and stores the invitation in the database.
 *
 * @param projectId - The ID of the project the user is being invited to
 * @param invitedEmail - The email address of the user being invited
 * @param role - The role to assign to the user when they accept
 * @param inviterId - The ID of the user creating the invitation
 * @returns The created invitation
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export async function createInvitation(
  projectId: string,
  invitedEmail: string,
  role: Role,
  inviterId: string
): Promise<Invitation> {
  // Generate unique token using crypto.randomBytes
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString('hex');

  // Set expiration timestamp (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store invitation in database
  const invitation = await prisma.invitation.create({
    data: {
      token,
      projectId,
      invitedEmail,
      role,
      expiresAt,
    },
  });

  return invitation;
}

/**
 * Send an invitation email to a user
 *
 * Generates an email with an acceptance link containing the invitation token,
 * includes the project name and inviter name in the email body, and calls
 * the sendEmail utility to deliver the email.
 *
 * The acceptance link format is: {APP_BASE_URL}/invite/accept?token={TOKEN}
 *
 * @param invitation - The invitation to send
 * @param project - The project the user is being invited to
 * @param inviter - The user who created the invitation
 * @returns The send result from the email utility
 *
 * Requirements: 5.4, 16.2, 16.3, 16.4
 */
export async function sendInvitationEmail(
  invitation: Invitation,
  project: Project,
  inviter: User
): Promise<SendEmailResult> {
  // Get base URL from environment variable
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  // Generate acceptance link with token
  const acceptanceLink = `${baseUrl}/invite/accept?token=${invitation.token}`;

  // Create email subject
  const subject = `You've been invited to join ${project.name} on Prism`;

  // Create plain text email body
  const text = `Hi there,

${inviter.name} (${inviter.email}) has invited you to join the project "${project.name}" on Prism as a ${invitation.role}.

To accept this invitation, please click the link below:

${acceptanceLink}

This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.

If you have any questions, please contact ${inviter.name} at ${inviter.email}.

Best regards,
The Prism Team`;

  // Create HTML email body
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've been invited to Prism</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p><strong>${inviter.name}</strong> (${inviter.email}) has invited you to join the project <strong>"${project.name}"</strong> on Prism as a <strong>${invitation.role}</strong>.</p>
      <p>To accept this invitation, please click the button below:</p>
      <p style="text-align: center;">
        <a href="${acceptanceLink}" class="button">Accept Invitation</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${acceptanceLink}</p>
      <p>This invitation will expire on <strong>${invitation.expiresAt.toLocaleDateString()}</strong>.</p>
      <p>If you have any questions, please contact ${inviter.name} at ${inviter.email}.</p>
      <p>Best regards,<br>The Prism Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Prism CDP + Analytics Platform.</p>
    </div>
  </div>
</body>
</html>`;

  // Send the email
  return sendEmail({
    to: invitation.invitedEmail,
    subject,
    text,
    html,
  });
}

/**
 * Validate an invitation token and return the invitation if valid
 *
 * Looks up the invitation by token and verifies it exists and has not expired.
 * Returns null if the token is invalid or the invitation has expired.
 *
 * @param token - The invitation token to validate
 * @returns The invitation if valid, null otherwise
 *
 * Requirements: 5.5, 5.9
 */
export async function validateInvitationToken(token: string): Promise<Invitation | null> {
  // Look up invitation by token
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  // Return null if invitation not found
  if (!invitation) {
    return null;
  }

  // Check if invitation has expired
  const now = new Date();
  if (invitation.expiresAt < now) {
    return null;
  }

  // Check if invitation has already been accepted
  if (invitation.acceptedAt !== null) {
    return null;
  }

  return invitation;
}

/**
 * Accept an invitation and create a ProjectMembership
 *
 * Validates the invitation token, verifies the email matches the invitedEmail,
 * creates a ProjectMembership with the specified role, and marks the invitation
 * as accepted by setting the acceptedAt timestamp.
 *
 * @param token - The invitation token
 * @param email - The email address of the user accepting the invitation
 * @returns The created ProjectMembership
 * @throws ValidationError if token is invalid, expired, or invitation already accepted
 * @throws ValidationError if email doesn't match invitedEmail
 * @throws AuthenticationError if user is not authenticated
 *
 * Requirements: 5.6, 5.7, 5.8, 5.11, 19.1, 19.4
 */
export async function acceptInvitation(
  token: string,
  email: string
): Promise<{ id: string; userId: string; projectId: string; role: Role }> {
  // Validate the invitation token
  const invitation = await validateInvitationToken(token);

  if (!invitation) {
    throw new ValidationError('Invalid or expired invitation');
  }

  // Verify email matches invitedEmail
  if (invitation.invitedEmail !== email) {
    throw new ValidationError('This invitation was sent to a different email address');
  }

  // Find or create user with this email
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AuthenticationError('User must be authenticated before accepting invitation');
  }

  // Create ProjectMembership and mark invitation as accepted in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create ProjectMembership
    const membership = await tx.projectMembership.create({
      data: {
        userId: user.id,
        projectId: invitation.projectId,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return membership;
  });

  return result;
}

/**
 * Resend an invitation by extending its expiration and sending a new email
 *
 * Extends the expiresAt timestamp by adding 7 days from the current time,
 * and resends the invitation email with the same token.
 *
 * @param invitationId - The ID of the invitation to resend
 * @returns The send result from the email utility
 * @throws NotFoundError if invitation not found
 * @throws ValidationError if invitation already accepted
 *
 * Requirements: 5.10, 19.1, 19.4
 */
export async function resendInvitation(invitationId: string): Promise<SendEmailResult> {
  // Look up the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      project: true,
    },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  // Check if invitation has already been accepted
  if (invitation.acceptedAt !== null) {
    throw new ValidationError('Cannot resend an invitation that has already been accepted');
  }

  // Extend the expiresAt timestamp (add 7 days from current time)
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  // Update the invitation with new expiration
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: { expiresAt: newExpiresAt },
  });

  // Get the inviter information (we need to find who created this invitation)
  // Since we don't store inviterId, we'll need to find a project owner or admin
  const projectMembership = await prisma.projectMembership.findFirst({
    where: {
      projectId: invitation.projectId,
      role: { in: ['owner', 'admin'] },
    },
    include: {
      user: true,
    },
  });

  if (!projectMembership) {
    throw new NotFoundError('Project owner or admin');
  }

  // Resend the email with the same token
  return sendInvitationEmail(
    updatedInvitation,
    invitation.project,
    projectMembership.user
  );
}

