import { createInvitation } from '@/lib/invitation';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

describe('Invitation Creation', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('createInvitation generates unique token and stores invitation', async () => {
    // Create test user and project
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    await prisma.projectMembership.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Create invitation
    const invitation = await createInvitation(
      project.id,
      'invited@example.com',
      'editor',
      user.id
    );

    // Verify invitation was created with correct properties
    expect(invitation.id).toBeDefined();
    expect(invitation.token).toBeDefined();
    expect(invitation.token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(invitation.projectId).toBe(project.id);
    expect(invitation.invitedEmail).toBe('invited@example.com');
    expect(invitation.role).toBe('editor');
    expect(invitation.acceptedAt).toBeNull();
    expect(invitation.createdAt).toBeInstanceOf(Date);
    expect(invitation.expiresAt).toBeInstanceOf(Date);

    // Verify expiration is approximately 7 days from now
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(invitation.expiresAt.getTime() - sevenDaysFromNow.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

    // Verify invitation was stored in database
    const storedInvitation = await prisma.invitation.findUnique({
      where: { token: invitation.token },
    });
    expect(storedInvitation).toBeDefined();
    expect(storedInvitation?.invitedEmail).toBe('invited@example.com');
  });

  test('createInvitation generates unique tokens for multiple invitations', async () => {
    // Create test user and project
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    await prisma.projectMembership.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Create multiple invitations
    const invitation1 = await createInvitation(
      project.id,
      'user1@example.com',
      'editor',
      user.id
    );

    const invitation2 = await createInvitation(
      project.id,
      'user2@example.com',
      'viewer',
      user.id
    );

    // Verify tokens are unique
    expect(invitation1.token).not.toBe(invitation2.token);
    expect(invitation1.id).not.toBe(invitation2.id);

    // Verify both invitations are stored
    const invitations = await prisma.invitation.findMany({
      where: { projectId: project.id },
    });
    expect(invitations).toHaveLength(2);
  });

  test('createInvitation supports all role types', async () => {
    // Create test user and project
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    await prisma.projectMembership.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Test each role type
    const roles: Role[] = ['owner', 'admin', 'editor', 'viewer'];
    
    for (const role of roles) {
      const invitation = await createInvitation(
        project.id,
        `${role}@example.com`,
        role,
        user.id
      );
      
      expect(invitation.role).toBe(role);
    }

    // Verify all invitations were created
    const invitations = await prisma.invitation.findMany({
      where: { projectId: project.id },
    });
    expect(invitations).toHaveLength(4);
  });
});


describe('Invitation Email Sending', () => {
  // Mock the sendEmail function
  let mockSendEmail: jest.Mock;
  
  beforeEach(() => {
    // Reset modules to clear any cached imports
    jest.resetModules();
    
    // Create mock function
    mockSendEmail = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
    
    // Mock the email module
    jest.mock('@/lib/email', () => ({
      sendEmail: mockSendEmail,
    }));
  });

  afterEach(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('sendInvitationEmail generates correct acceptance link', async () => {
    // Import after mocking
    const { sendInvitationEmail } = await import('@/lib/invitation');
    const { sendEmail } = await import('@/lib/email');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'test-token-123',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set APP_BASE_URL for testing
    const originalBaseUrl = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = 'https://prism.example.com';

    // Send invitation email
    const result = await sendInvitationEmail(
      invitation,
      project,
      user
    );

    // Restore original APP_BASE_URL
    process.env.APP_BASE_URL = originalBaseUrl;

    // Verify sendEmail was called
    expect(sendEmail).toHaveBeenCalledTimes(1);
    
    const emailOptions = (sendEmail as jest.Mock).mock.calls[0][0];
    
    // Verify email recipient
    expect(emailOptions.to).toBe('invited@example.com');
    
    // Verify subject includes project name
    expect(emailOptions.subject).toContain('Test Project');
    
    // Verify text body includes acceptance link with token
    expect(emailOptions.text).toContain('https://prism.example.com/invite/accept?token=test-token-123');
    
    // Verify text body includes project name
    expect(emailOptions.text).toContain('Test Project');
    
    // Verify text body includes inviter name
    expect(emailOptions.text).toContain('Owner User');
    
    // Verify HTML body includes acceptance link
    expect(emailOptions.html).toContain('https://prism.example.com/invite/accept?token=test-token-123');
    
    // Verify HTML body includes project name
    expect(emailOptions.html).toContain('Test Project');
    
    // Verify HTML body includes inviter name
    expect(emailOptions.html).toContain('Owner User');
    
    // Verify result
    expect(result.success).toBe(true);
  });

  test('sendInvitationEmail uses default base URL when APP_BASE_URL not set', async () => {
    // Import after mocking
    const { sendInvitationEmail } = await import('@/lib/invitation');
    const { sendEmail } = await import('@/lib/email');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'test-token-456',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'viewer',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Clear APP_BASE_URL
    const originalBaseUrl = process.env.APP_BASE_URL;
    delete process.env.APP_BASE_URL;

    // Send invitation email
    await sendInvitationEmail(
      invitation,
      project,
      user
    );

    // Restore original APP_BASE_URL
    process.env.APP_BASE_URL = originalBaseUrl;

    // Verify sendEmail was called with default base URL
    const emailOptions = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(emailOptions.text).toContain('http://localhost:3000/invite/accept?token=test-token-456');
  });

  test('sendInvitationEmail includes all required information', async () => {
    // Import after mocking
    const { sendInvitationEmail } = await import('@/lib/invitation');
    const { sendEmail } = await import('@/lib/email');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Analytics Project',
      },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.invitation.create({
      data: {
        token: 'test-token-789',
        projectId: project.id,
        invitedEmail: 'newuser@example.com',
        role: 'admin',
        expiresAt,
      },
    });

    // Send invitation email
    await sendInvitationEmail(
      invitation,
      project,
      user
    );

    // Verify all required information is included
    const emailOptions = (sendEmail as jest.Mock).mock.calls[0][0];
    
    // Check recipient
    expect(emailOptions.to).toBe('newuser@example.com');
    
    // Check subject
    expect(emailOptions.subject).toBe("You've been invited to join Analytics Project on Prism");
    
    // Check text body includes all required elements
    expect(emailOptions.text).toContain('Admin User'); // inviter name
    expect(emailOptions.text).toContain('admin@example.com'); // inviter email
    expect(emailOptions.text).toContain('Analytics Project'); // project name
    expect(emailOptions.text).toContain('admin'); // role
    expect(emailOptions.text).toContain('/invite/accept?token=test-token-789'); // acceptance link
    expect(emailOptions.text).toContain(expiresAt.toLocaleDateString()); // expiration date
    
    // Check HTML body includes all required elements
    expect(emailOptions.html).toContain('Admin User');
    expect(emailOptions.html).toContain('admin@example.com');
    expect(emailOptions.html).toContain('Analytics Project');
    expect(emailOptions.html).toContain('admin');
    expect(emailOptions.html).toContain('/invite/accept?token=test-token-789');
    expect(emailOptions.html).toContain(expiresAt.toLocaleDateString());
  });

  test('sendInvitationEmail returns send result', async () => {
    // Import after mocking
    const { sendInvitationEmail } = await import('@/lib/invitation');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'test-token-result',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Test successful send
    mockSendEmail.mockResolvedValueOnce({
      success: true,
      messageId: 'msg-123',
    });

    const successResult = await sendInvitationEmail(
      invitation,
      project,
      user
    );

    expect(successResult.success).toBe(true);
    expect(successResult.messageId).toBe('msg-123');

    // Test failed send
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      error: 'SMTP connection failed',
    });

    const failResult = await sendInvitationEmail(
      invitation,
      project,
      user
    );

    expect(failResult.success).toBe(false);
    expect(failResult.error).toBe('SMTP connection failed');
  });
});


describe('Invitation Validation', () => {
  afterEach(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('validateInvitationToken returns invitation for valid token', async () => {
    const { validateInvitationToken } = await import('@/lib/invitation');
    
    // Create test data
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'valid-token-123',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Validate the token
    const result = await validateInvitationToken('valid-token-123');

    expect(result).toBeDefined();
    expect(result?.id).toBe(invitation.id);
    expect(result?.token).toBe('valid-token-123');
    expect(result?.invitedEmail).toBe('invited@example.com');
  });

  test('validateInvitationToken returns null for invalid token', async () => {
    const { validateInvitationToken } = await import('@/lib/invitation');
    
    // Try to validate non-existent token
    const result = await validateInvitationToken('non-existent-token');

    expect(result).toBeNull();
  });

  test('validateInvitationToken returns null for expired invitation', async () => {
    const { validateInvitationToken } = await import('@/lib/invitation');
    
    // Create test data
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    // Create expired invitation
    await prisma.invitation.create({
      data: {
        token: 'expired-token-123',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    // Try to validate expired token
    const result = await validateInvitationToken('expired-token-123');

    expect(result).toBeNull();
  });

  test('validateInvitationToken returns null for already accepted invitation', async () => {
    const { validateInvitationToken } = await import('@/lib/invitation');
    
    // Create test data
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    // Create accepted invitation
    await prisma.invitation.create({
      data: {
        token: 'accepted-token-123',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(), // Already accepted
      },
    });

    // Try to validate accepted token
    const result = await validateInvitationToken('accepted-token-123');

    expect(result).toBeNull();
  });
});

describe('Invitation Acceptance', () => {
  afterEach(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('acceptInvitation creates ProjectMembership for valid invitation', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'invited@example.com',
        name: 'Invited User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'valid-token-456',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Accept the invitation
    const membership = await acceptInvitation('valid-token-456', 'invited@example.com');

    // Verify membership was created
    expect(membership).toBeDefined();
    expect(membership.userId).toBe(user.id);
    expect(membership.projectId).toBe(project.id);
    expect(membership.role).toBe('editor');

    // Verify membership exists in database
    const storedMembership = await prisma.projectMembership.findUnique({
      where: { id: membership.id },
    });
    expect(storedMembership).toBeDefined();

    // Verify invitation was marked as accepted
    const updatedInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(updatedInvitation?.acceptedAt).toBeInstanceOf(Date);
    expect(updatedInvitation?.acceptedAt).not.toBeNull();
  });

  test('acceptInvitation rejects mismatched email', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test data
    await prisma.user.create({
      data: {
        email: 'different@example.com',
        name: 'Different User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.invitation.create({
      data: {
        token: 'mismatch-token-789',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Try to accept with different email
    await expect(
      acceptInvitation('mismatch-token-789', 'different@example.com')
    ).rejects.toThrow('This invitation was sent to a different email address');

    // Verify no membership was created
    const memberships = await prisma.projectMembership.findMany({
      where: { projectId: project.id },
    });
    expect(memberships).toHaveLength(0);
  });

  test('acceptInvitation rejects expired invitation', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test data
    await prisma.user.create({
      data: {
        email: 'invited@example.com',
        name: 'Invited User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.invitation.create({
      data: {
        token: 'expired-token-456',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() - 1000), // Expired
      },
    });

    // Try to accept expired invitation
    await expect(
      acceptInvitation('expired-token-456', 'invited@example.com')
    ).rejects.toThrow('Invalid or expired invitation');

    // Verify no membership was created
    const memberships = await prisma.projectMembership.findMany({
      where: { projectId: project.id },
    });
    expect(memberships).toHaveLength(0);
  });

  test('acceptInvitation rejects invalid token', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test user
    await prisma.user.create({
      data: {
        email: 'invited@example.com',
        name: 'Invited User',
      },
    });

    // Try to accept with non-existent token
    await expect(
      acceptInvitation('non-existent-token', 'invited@example.com')
    ).rejects.toThrow('Invalid or expired invitation');
  });

  test('acceptInvitation rejects already accepted invitation', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'invited@example.com',
        name: 'Invited User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.invitation.create({
      data: {
        token: 'accepted-token-456',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(), // Already accepted
      },
    });

    // Try to accept already accepted invitation
    await expect(
      acceptInvitation('accepted-token-456', 'invited@example.com')
    ).rejects.toThrow('Invalid or expired invitation');
  });

  test('acceptInvitation requires authenticated user', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Create test data without creating user
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.invitation.create({
      data: {
        token: 'no-user-token-789',
        projectId: project.id,
        invitedEmail: 'notauser@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Try to accept without user existing
    await expect(
      acceptInvitation('no-user-token-789', 'notauser@example.com')
    ).rejects.toThrow('User must be authenticated before accepting invitation');
  });

  test('acceptInvitation assigns correct role', async () => {
    const { acceptInvitation } = await import('@/lib/invitation');
    
    // Test each role type
    const roles: Role[] = ['owner', 'admin', 'editor', 'viewer'];
    
    for (const role of roles) {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: `${role}@example.com`,
          name: `${role} User`,
        },
      });

      const project = await prisma.project.create({
        data: { name: `Test Project ${role}` },
      });

      await prisma.invitation.create({
        data: {
          token: `token-${role}`,
          projectId: project.id,
          invitedEmail: `${role}@example.com`,
          role: role,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Accept invitation
      const membership = await acceptInvitation(`token-${role}`, `${role}@example.com`);

      // Verify correct role was assigned
      expect(membership.role).toBe(role);
    }
  });
});


describe('Invitation Resend', () => {
  // Mock the sendEmail function
  let mockSendEmail: jest.Mock;
  
  beforeEach(() => {
    // Reset modules to clear any cached imports
    jest.resetModules();
    
    // Create mock function
    mockSendEmail = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
    
    // Mock the email module
    jest.mock('@/lib/email', () => ({
      sendEmail: mockSendEmail,
    }));
  });

  afterEach(async () => {
    await prisma.invitation.deleteMany({});
    await prisma.projectMembership.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('resendInvitation extends expiresAt timestamp by 7 days', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Create invitation with original expiration
    const originalExpiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    const invitation = await prisma.invitation.create({
      data: {
        token: 'resend-token-123',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: originalExpiresAt,
      },
    });

    // Capture current time before resend
    const beforeResend = new Date();

    // Resend the invitation
    await resendInvitation(invitation.id);

    // Get updated invitation
    const updatedInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });

    // Verify expiresAt was extended
    expect(updatedInvitation).toBeDefined();
    expect(updatedInvitation!.expiresAt.getTime()).toBeGreaterThan(originalExpiresAt.getTime());

    // Verify new expiration is approximately 7 days from now
    const sevenDaysFromNow = new Date(beforeResend.getTime() + 7 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(updatedInvitation!.expiresAt.getTime() - sevenDaysFromNow.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  test('resendInvitation sends email with same token', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    const { sendEmail } = await import('@/lib/email');
    
    // Create test data
    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'same-token-456',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    // Resend the invitation
    const result = await resendInvitation(invitation.id);

    // Verify sendEmail was called
    expect(sendEmail).toHaveBeenCalledTimes(1);
    
    const emailOptions = (sendEmail as jest.Mock).mock.calls[0][0];
    
    // Verify email contains the same token
    expect(emailOptions.text).toContain('same-token-456');
    expect(emailOptions.html).toContain('same-token-456');
    
    // Verify result
    expect(result.success).toBe(true);
  });

  test('resendInvitation returns send result', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'result-token-789',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    // Test successful send
    mockSendEmail.mockResolvedValueOnce({
      success: true,
      messageId: 'resend-msg-123',
    });

    const successResult = await resendInvitation(invitation.id);

    expect(successResult.success).toBe(true);
    expect(successResult.messageId).toBe('resend-msg-123');

    // Test failed send
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      error: 'SMTP connection failed',
    });

    const failResult = await resendInvitation(invitation.id);

    expect(failResult.success).toBe(false);
    expect(failResult.error).toBe('SMTP connection failed');
  });

  test('resendInvitation rejects non-existent invitation', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Try to resend non-existent invitation
    await expect(
      resendInvitation('non-existent-id')
    ).rejects.toThrow('Invitation not found');
  });

  test('resendInvitation rejects already accepted invitation', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Create accepted invitation
    const invitation = await prisma.invitation.create({
      data: {
        token: 'accepted-resend-token',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(), // Already accepted
      },
    });

    // Try to resend accepted invitation
    await expect(
      resendInvitation(invitation.id)
    ).rejects.toThrow('Cannot resend an invitation that has already been accepted');
  });

  test('resendInvitation works with expired invitation', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Create test data
    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'owner',
      },
    });

    // Create expired invitation
    const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago
    const invitation = await prisma.invitation.create({
      data: {
        token: 'expired-resend-token',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: expiredDate,
      },
    });

    // Resend should work and extend the expiration
    const result = await resendInvitation(invitation.id);

    expect(result.success).toBe(true);

    // Verify expiration was extended to future
    const updatedInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });

    expect(updatedInvitation!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('resendInvitation uses project owner or admin as sender', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    const { sendEmail } = await import('@/lib/email');
    
    // Create test data with admin (not owner)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: admin.id,
        projectId: project.id,
        role: 'admin',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'admin-sender-token',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    // Resend the invitation
    await resendInvitation(invitation.id);

    // Verify email was sent with admin as sender
    const emailOptions = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(emailOptions.text).toContain('Admin User');
    expect(emailOptions.text).toContain('admin@example.com');
  });

  test('resendInvitation fails if no owner or admin exists', async () => {
    const { resendInvitation } = await import('@/lib/invitation');
    
    // Create test data with only editor (no owner/admin)
    const editor = await prisma.user.create({
      data: {
        email: 'editor@example.com',
        name: 'Editor User',
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });

    await prisma.projectMembership.create({
      data: {
        userId: editor.id,
        projectId: project.id,
        role: 'editor',
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        token: 'no-admin-token',
        projectId: project.id,
        invitedEmail: 'invited@example.com',
        role: 'viewer',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    // Try to resend without owner/admin
    await expect(
      resendInvitation(invitation.id)
    ).rejects.toThrow('Project owner or admin not found');
  });
});
