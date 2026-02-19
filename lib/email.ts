import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTP configuration from environment variables
function getSMTPConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };
}

function getSMTPFrom() {
  return process.env.SMTP_FROM || 'noreply@example.com';
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min in milliseconds

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSMTPConfig());
  }
  return transporter;
}

// Export for testing purposes
export function resetTransporter(): void {
  transporter = null;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email with retry logic for failed deliveries
 *
 * @param options - Email options (to, subject, text, html)
 * @param retryCount - Current retry attempt (internal use)
 * @returns Promise with send result
 */
export async function sendEmail(
  options: EmailOptions,
  retryCount: number = 0
): Promise<SendEmailResult> {
  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: getSMTPFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Email delivery failed:', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
        retryCount,
      });
    }

    // If we haven't exceeded max retries, schedule a retry
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount];

      // Only log in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Scheduling email retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
      }

      // Wait for the delay period
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the send
      return sendEmail(options, retryCount + 1);
    }

    // Max retries exceeded
    if (process.env.NODE_ENV !== 'test') {
      console.error('Email delivery permanently failed after max retries:', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify SMTP connection configuration
 *
 * @returns Promise that resolves if connection is successful
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log('SMTP connection verified successfully');
    }
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('SMTP connection verification failed:', errorMessage);
    }
    return false;
  }
}
