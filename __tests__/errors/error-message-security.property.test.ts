/**
 * Property-based tests for error message security
 * 
 * Feature: prism
 * Testing Framework: fast-check
 * 
 * Tests that the system does not expose sensitive implementation details
 * (stack traces, database errors, internal paths) in error responses to non-admin users.
 */

import * as fc from 'fast-check';
import {
  AppError,
  ValidationError,
  formatErrorResponse,
  sanitizeErrorMessage,
} from '@/lib/errors';

describe('Error Message Security Property Tests', () => {
  /**
   * Property 27: Error Message Security
   * 
   * For any error response to a non-admin user, the system must not expose
   * sensitive implementation details (stack traces, database errors, internal paths).
   * 
   * **Validates: Requirements 19.6**
   */
  describe('Property 27: Error message security', () => {
    test('Non-operational errors do not expose sensitive details to non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }), // error message with potential sensitive info
          fc.boolean(), // isOperational flag
          async (errorMessage, isOperational) => {
            // Create an AppError with potentially sensitive information
            const error = new AppError(errorMessage, 500, isOperational);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            if (isOperational) {
              // Operational errors can expose their message
              expect(response.error.message).toBe(errorMessage);
            } else {
              // Non-operational errors must be sanitized
              // Requirement 19.6: Must not expose sensitive implementation details
              expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
              expect(response.error.message).not.toBe(errorMessage);
            }
            
            // Details should never be exposed to non-admin users
            expect(response.error.details).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Generic Error instances are sanitized for non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          async (errorMessage) => {
            // Create a generic Error (non-operational)
            const error = new Error(errorMessage);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Requirement 19.6: Generic errors must not expose original message
            expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
            expect(response.error.message).not.toContain(errorMessage);
            
            // Status code should be 500
            expect(response.error.statusCode).toBe(500);
            
            // Code should be InternalServerError
            expect(response.error.code).toBe('InternalServerError');
            
            // Details should not be exposed
            expect(response.error.details).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Stack traces are never exposed to non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          fc.boolean(), // isOperational flag
          async (errorMessage, isOperational) => {
            // Create an error with a stack trace
            const error = new AppError(errorMessage, 500, isOperational);
            
            // Ensure error has a stack trace
            expect(error.stack).toBeDefined();
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Requirement 19.6: Stack traces must not be exposed
            const responseStr = JSON.stringify(response);
            expect(responseStr).not.toContain('at ');
            expect(responseStr).not.toContain('.ts:');
            expect(responseStr).not.toContain('.js:');
            expect(responseStr).not.toContain('Error:');
            
            // Stack trace should not be in any field
            expect(response.error.message).not.toContain(error.stack || '');
            if (response.error.details) {
              const detailsStr = JSON.stringify(response.error.details);
              expect(detailsStr).not.toContain(error.stack || '');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Database error details are sanitized for non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'PrismaClientKnownRequestError',
            'PrismaClientInitializationError',
            'PrismaClientRustPanicError',
            'PrismaClientValidationError'
          ), // Prisma error types
          fc.string({ minLength: 10, maxLength: 200 }), // error message with DB details
          async (errorType, errorMessage) => {
            // Create a mock Prisma error
            const prismaError: any = new Error(errorMessage);
            Object.defineProperty(prismaError.constructor, 'name', {
              value: errorType,
              writable: false,
            });
            
            // Format error response for non-admin user
            const response = formatErrorResponse(prismaError, false);
            
            // Requirement 19.6: Database errors must be sanitized
            expect(response.error.message).not.toContain(errorMessage);
            
            // Should return generic database error message
            expect(
              response.error.message === 'Service temporarily unavailable' ||
              response.error.message === 'Database operation failed' ||
              response.error.message.includes('already exists') ||
              response.error.message.includes('not found')
            ).toBe(true);
            
            // Original error message should not be exposed
            expect(response.error.details).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Internal file paths are not exposed to non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '/usr/src/app/lib/auth.ts',
            '/home/user/project/src/utils.ts',
            'C:\\Users\\dev\\project\\lib\\session.ts',
            '/var/www/app/node_modules/next/dist/server.js'
          ), // internal paths
          async (internalPath) => {
            // Create a non-operational error with internal path in message
            const errorMessage = `Error in ${internalPath}: Failed`;
            const error = new Error(errorMessage);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Requirement 19.6: Internal paths must not be exposed
            expect(response.error.message).not.toContain(internalPath);
            expect(response.error.message).not.toContain('/usr/');
            expect(response.error.message).not.toContain('/home/');
            expect(response.error.message).not.toContain('C:\\');
            expect(response.error.message).not.toContain('/var/');
            expect(response.error.message).not.toContain('.ts');
            expect(response.error.message).not.toContain('.js');
            
            // Error message should be sanitized (either generic or database error message)
            // Both are acceptable as they don't expose the internal path
            expect(
              response.error.message === 'An unexpected error occurred. Please try again later.' ||
              response.error.message === 'Service temporarily unavailable' ||
              response.error.message === 'Database operation failed'
            ).toBe(true);
            
            // Status code should be 500 or 503 (both indicate server error)
            expect([500, 503]).toContain(response.error.statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Admin users receive full error details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          fc.record({
            debug: fc.string(),
            context: fc.string(),
          }), // error details
          async (errorMessage, details) => {
            // Create an error with details
            const error = new AppError(errorMessage, 500, false, details);
            
            // Format error response for admin user
            const response = formatErrorResponse(error, true);
            
            // Admin should receive full error message
            expect(response.error.message).toBe(errorMessage);
            
            // Admin should receive error details
            expect(response.error.details).toEqual(details);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Operational errors are safe to expose to non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({
              type: fc.constant('validation'),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              fields: fc.dictionary(fc.string(), fc.string()),
            }),
            fc.record({
              type: fc.constant('notfound'),
              resource: fc.constantFrom('Project', 'User', 'Dashboard', 'Report'),
            }),
            fc.record({
              type: fc.constant('authorization'),
              message: fc.string({ minLength: 1, maxLength: 100 }),
            })
          ),
          async (errorConfig) => {
            let error: AppError;
            
            if (errorConfig.type === 'validation') {
              error = new ValidationError(errorConfig.message, errorConfig.fields);
            } else if (errorConfig.type === 'notfound') {
              error = new AppError(`${errorConfig.resource} not found`, 404, true);
            } else {
              error = new AppError(errorConfig.message, 403, true);
            }
            
            // All these errors are operational
            expect(error.isOperational).toBe(true);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Operational errors can expose their message
            expect(response.error.message).toBe(error.message);
            
            // But details should still not be exposed to non-admin
            expect(response.error.details).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sanitizeErrorMessage function properly sanitizes non-operational errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          async (errorMessage) => {
            // Create a non-operational error
            const error = new Error(errorMessage);
            
            // Sanitize for non-admin user
            const sanitized = sanitizeErrorMessage(error, false);
            
            // Requirement 19.6: Must return generic message
            expect(sanitized).toBe('An unexpected error occurred. Please try again later.');
            expect(sanitized).not.toContain(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sanitizeErrorMessage preserves operational error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }), // error message
          async (errorMessage) => {
            // Create an operational error
            const error = new AppError(errorMessage, 400, true);
            
            // Sanitize for non-admin user
            const sanitized = sanitizeErrorMessage(error, false);
            
            // Operational errors should preserve their message
            expect(sanitized).toBe(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Error responses never contain sensitive keywords for non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'postgresql://user:pass@localhost/mydb',
            'password: secret123',
            'API key: sk_live_abc123',
            'JWT token: eyJhbGc',
            'SELECT * FROM users WHERE id = 1',
            'DROP TABLE users CASCADE',
            'process.env.SECRET_KEY',
            'throw new Error at line 42',
            'at Object.<anonymous> (/app/lib/auth.ts:15:10)',
            'node_modules/express/lib/router.js',
            '/usr/local/lib/node/error.js',
          ), // sensitive content
          async (sensitiveContent) => {
            // Create a non-operational error with sensitive content
            const error = new Error(`Internal error: ${sensitiveContent}`);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Requirement 19.6: Sensitive content must not be exposed
            // Error message should be sanitized (generic or database error message)
            expect(
              response.error.message === 'An unexpected error occurred. Please try again later.' ||
              response.error.message === 'Service temporarily unavailable' ||
              response.error.message === 'Database operation failed'
            ).toBe(true);
            
            const responseStr = JSON.stringify(response).toLowerCase();
            
            // Check that sensitive patterns are not in the response
            expect(responseStr).not.toContain('password');
            expect(responseStr).not.toContain('secret');
            expect(responseStr).not.toContain('api key');
            expect(responseStr).not.toContain('token: ey');
            expect(responseStr).not.toContain('select *');
            expect(responseStr).not.toContain('drop table');
            expect(responseStr).not.toContain('process.env');
            expect(responseStr).not.toContain('node_modules');
            expect(responseStr).not.toContain('/usr/');
            expect(responseStr).not.toContain('at object.<anonymous>');
            expect(responseStr).not.toContain('postgresql://');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Multiple sequential errors maintain security for non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              message: fc.string({ minLength: 10, maxLength: 200 }),
              isOperational: fc.boolean(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (errorConfigs) => {
            const errors = errorConfigs.map(
              config => new AppError(config.message, 500, config.isOperational)
            );
            
            // Format all errors for non-admin user
            const responses = errors.map(err => formatErrorResponse(err, false));
            
            // Check each response
            for (let i = 0; i < errors.length; i++) {
              const error = errors[i];
              const response = responses[i];
              
              if (error.isOperational) {
                // Operational errors can expose message
                expect(response.error.message).toBe(error.message);
              } else {
                // Non-operational errors must be sanitized
                expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
              }
              
              // Details should never be exposed to non-admin
              expect(response.error.details).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Error security is consistent across different status codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }), // HTTP status code
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          async (statusCode, errorMessage) => {
            // Create a non-operational error with various status codes
            const error = new AppError(errorMessage, statusCode, false);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(error, false);
            
            // Requirement 19.6: All non-operational errors must be sanitized
            // regardless of status code
            expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
            expect(response.error.message).not.toContain(errorMessage);
            expect(response.error.details).toBeUndefined();
            
            // Status code should be preserved
            expect(response.error.statusCode).toBe(statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
