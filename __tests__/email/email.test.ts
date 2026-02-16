/**
 * Unit tests for email delivery system
 * 
 * Feature: prism
 * Testing Framework: Jest
 */

import { sendEmail, verifyEmailConnection, resetTransporter } from '@/lib/email';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Delivery System', () => {
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset transporter to ensure fresh instance
    resetTransporter();
    
    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Set environment variables for testing
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASSWORD = 'testpassword';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  afterEach(async () => {
    // Reset transporter
    resetTransporter();
    
    // Clear environment variables
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;
    
    // Ensure all timers are cleared and restored
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Wait for any pending promises to resolve
    await new Promise(resolve => setImmediate(resolve));
  });

  describe('SMTP Configuration', () => {
    /**
     * Test SMTP configuration loaded from environment
     * 
     * **Validates: Requirements 16.1**
     */
    test('loads SMTP configuration from environment variables', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Verify createTransport was called with correct config
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false, // false for port 587
        auth: {
          user: 'test@test.com',
          pass: 'testpassword',
        },
      });
    });

    test('uses secure connection for port 465', async () => {
      // Reset transporter and update env
      resetTransporter();
      process.env.SMTP_PORT = '465';
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Verify secure flag is true for port 465
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    test('uses default FROM address if not provided', async () => {
      // Reset transporter and remove SMTP_FROM
      resetTransporter();
      delete process.env.SMTP_FROM;
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Verify default FROM address is used
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com',
        })
      );
    });
  });

  describe('Email Sending', () => {
    test('successfully sends email with text content', async () => {
      const messageId = 'test-message-id-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        text: 'Welcome to Prism!',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(messageId);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@example.com',
        subject: 'Welcome',
        text: 'Welcome to Prism!',
        html: undefined,
      });
    });

    test('successfully sends email with HTML content', async () => {
      const messageId = 'test-message-id-456';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        text: 'Welcome to Prism!',
        html: '<p>Welcome to <strong>Prism</strong>!</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(messageId);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@example.com',
        subject: 'Welcome',
        text: 'Welcome to Prism!',
        html: '<p>Welcome to <strong>Prism</strong>!</p>',
      });
    });
  });

  describe('Error Handling and Retry Logic', () => {
    /**
     * Test email delivery failure logged and queued
     * 
     * **Validates: Requirements 16.5**
     */
    test('logs error and retries on delivery failure', async () => {
      // Mock setTimeout to avoid actual delays in tests
      jest.useFakeTimers();

      // Fail first 2 attempts, succeed on 3rd
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({ messageId: 'success-id' });

      // Start the send operation
      const sendPromise = sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Fast-forward through first retry delay (1 minute)
      await jest.advanceTimersByTimeAsync(60000);
      
      // Fast-forward through second retry delay (5 minutes)
      await jest.advanceTimersByTimeAsync(300000);

      // Wait for the promise to resolve
      const result = await sendPromise;

      // Verify success after retries
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('success-id');

      // Verify sendMail was called 3 times (initial + 2 retries)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);

      // Clean up timers
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('returns failure after max retries exceeded', async () => {
      jest.useFakeTimers();

      // Fail all attempts
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP server unavailable'));

      // Start the send operation
      const sendPromise = sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Fast-forward through all retry delays
      await jest.advanceTimersByTimeAsync(60000);    // 1 min
      await jest.advanceTimersByTimeAsync(300000);   // 5 min
      await jest.advanceTimersByTimeAsync(900000);   // 15 min

      // Wait for the promise to resolve
      const result = await sendPromise;

      // Verify permanent failure
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP server unavailable');

      // Verify sendMail was called 4 times (initial + 3 retries)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(4);

      // Clean up timers
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('handles non-Error exceptions', async () => {
      jest.useFakeTimers();

      // Throw a non-Error object
      mockTransporter.sendMail.mockRejectedValue('String error');

      // Start the send operation
      const sendPromise = sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      // Fast-forward through all retry delays
      await jest.advanceTimersByTimeAsync(60000);    // 1 min
      await jest.advanceTimersByTimeAsync(300000);   // 5 min
      await jest.advanceTimersByTimeAsync(900000);   // 15 min

      // Wait for the promise to resolve
      const result = await sendPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');

      // Clean up timers
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe('Connection Verification', () => {
    test('successfully verifies SMTP connection', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await verifyEmailConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    test('handles connection verification failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Authentication failed'));

      const result = await verifyEmailConnection();

      expect(result).toBe(false);
    });
  });

  describe('Transporter Reuse', () => {
    test('reuses transporter instance across multiple sends', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      // Send multiple emails
      await sendEmail({
        to: 'user1@example.com',
        subject: 'Test 1',
        text: 'Message 1',
      });

      await sendEmail({
        to: 'user2@example.com',
        subject: 'Test 2',
        text: 'Message 2',
      });

      await sendEmail({
        to: 'user3@example.com',
        subject: 'Test 3',
        text: 'Message 3',
      });

      // Verify createTransport was only called once (transporter reused)
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
      
      // Verify sendMail was called 3 times
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });
  });
});
