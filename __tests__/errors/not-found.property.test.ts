/**
 * Property-based tests for resource not found errors
 * 
 * Feature: prism
 * Testing Framework: fast-check
 * 
 * Tests that the system returns HTTP 404 with an explanation for any request
 * for a non-existent resource (project, user, dashboard, report).
 */

import * as fc from 'fast-check';
import {
  NotFoundError,
  formatErrorResponse,
} from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getUserRole, hasProjectAccess } from '@/lib/project';
import { validateInvitationToken } from '@/lib/invitation';

describe('Resource Not Found Property Tests', () => {
  /**
   * Property 26: Resource Not Found Errors
   * 
   * For any request for a non-existent resource (project, user, dashboard, report),
   * the system must return HTTP 404 with an explanation.
   * 
   * **Validates: Requirements 19.4**
   */
  describe('Property 26: Resource not found errors', () => {
    test('NotFoundError returns HTTP 404 with explanation for any resource type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Project', 'User', 'Dashboard', 'Report', 'Invitation', 'Membership', 'Profile', 'Event'),
          async (resourceType) => {
            // Create a NotFoundError for the resource type
            const error = new NotFoundError(resourceType);
            
            // Requirement 19.4: System must return HTTP 404
            expect(error.statusCode).toBe(404);
            
            // Requirement 19.4: Error must include explanation
            expect(error.message).toBeDefined();
            expect(error.message).toContain(resourceType);
            expect(error.message).toContain('not found');
            
            // Error should be operational (safe to expose to users)
            expect(error.isOperational).toBe(true);
            
            // Format error response
            const response = formatErrorResponse(error, false);
            
            // Response must have HTTP 404 status
            expect(response.error.statusCode).toBe(404);
            
            // Response must include explanation message
            expect(response.error.message).toBeDefined();
            expect(response.error.message).toContain('not found');
            
            // Response must have NotFoundError code
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Querying non-existent project membership returns null (not found)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // non-existent user ID
          fc.uuid(), // non-existent project ID
          async (userId, projectId) => {
            // Query for a membership that doesn't exist
            const role = await getUserRole(userId, projectId);
            
            // Requirement 19.4: Non-existent resource returns null/not found indicator
            expect(role).toBeNull();
            
            // Check access also returns false
            const hasAccess = await hasProjectAccess(userId, projectId);
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Querying non-existent invitation returns null (not found)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // non-existent token
          async (token) => {
            // Query for an invitation that doesn't exist
            const invitation = await validateInvitationToken(token);
            
            // Requirement 19.4: Non-existent resource returns null/not found indicator
            expect(invitation).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('NotFoundError message format is consistent across resource types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // resource name
          async (resourceName) => {
            const error = new NotFoundError(resourceName);
            
            // Message should follow pattern: "{Resource} not found"
            expect(error.message).toBe(`${resourceName} not found`);
            
            // HTTP status should always be 404
            expect(error.statusCode).toBe(404);
            
            // Format response and verify consistency
            const response = formatErrorResponse(error, false);
            expect(response.error.statusCode).toBe(404);
            expect(response.error.message).toBe(`${resourceName} not found`);
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('NotFoundError with default resource name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(undefined), // no resource name provided
          async () => {
            const error = new NotFoundError();
            
            // Should use default "Resource" name
            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
            
            const response = formatErrorResponse(error, false);
            expect(response.error.statusCode).toBe(404);
            expect(response.error.message).toBe('Resource not found');
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('NotFoundError is exposed to non-admin users (operational error)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Project', 'User', 'Dashboard', 'Report'),
          fc.boolean(), // isAdmin flag
          async (resourceType, isAdmin) => {
            const error = new NotFoundError(resourceType);
            
            // NotFoundError is operational and should be exposed to all users
            expect(error.isOperational).toBe(true);
            
            // Format response for both admin and non-admin
            const response = formatErrorResponse(error, isAdmin);
            
            // Message should be the same for both admin and non-admin
            // (operational errors are safe to expose)
            expect(response.error.message).toBe(`${resourceType} not found`);
            expect(response.error.statusCode).toBe(404);
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Prisma record not found error (P2025) maps to HTTP 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // non-existent record ID
          async (recordId) => {
            // Create a proper Prisma error mock by creating a class with the right constructor name
            class PrismaClientKnownRequestError extends Error {
              code: string;
              constructor(message: string, code: string) {
                super(message);
                this.name = 'PrismaClientKnownRequestError';
                this.code = code;
              }
            }
            
            // Simulate Prisma P2025 error (record not found)
            const prismaError = new PrismaClientKnownRequestError('Record not found', 'P2025');
            
            // Format the Prisma error
            const response = formatErrorResponse(prismaError, false);
            
            // Requirement 19.4: Prisma not found errors should map to HTTP 404
            expect(response.error.statusCode).toBe(404);
            expect(response.error.message).toContain('not found');
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Prisma foreign key violation (P2003) maps to HTTP 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // non-existent foreign key reference
          async (foreignKeyId) => {
            // Create a proper Prisma error mock by creating a class with the right constructor name
            class PrismaClientKnownRequestError extends Error {
              code: string;
              constructor(message: string, code: string) {
                super(message);
                this.name = 'PrismaClientKnownRequestError';
                this.code = code;
              }
            }
            
            // Simulate Prisma P2003 error (foreign key constraint violation)
            const prismaError = new PrismaClientKnownRequestError('Foreign key constraint failed', 'P2003');
            
            // Format the Prisma error
            const response = formatErrorResponse(prismaError, false);
            
            // Requirement 19.4: Foreign key violations indicate referenced resource not found
            expect(response.error.statusCode).toBe(404);
            expect(response.error.message).toBe('Referenced resource not found');
            expect(response.error.code).toBe('NotFoundError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('NotFoundError response format is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Project', 'User', 'Dashboard', 'Report', 'Invitation'),
          async (resourceType) => {
            const error = new NotFoundError(resourceType);
            const response = formatErrorResponse(error, false);
            
            // Response must have error object
            expect(response.error).toBeDefined();
            
            // Error object must have required fields
            expect(response.error.message).toBeDefined();
            expect(typeof response.error.message).toBe('string');
            expect(response.error.message.length).toBeGreaterThan(0);
            
            expect(response.error.code).toBeDefined();
            expect(response.error.code).toBe('NotFoundError');
            
            expect(response.error.statusCode).toBeDefined();
            expect(response.error.statusCode).toBe(404);
            
            // NotFoundError should not have fields (that's for validation errors)
            expect(response.error.fields).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Multiple sequential not found errors maintain consistent behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('Project', 'User', 'Dashboard', 'Report'),
            { minLength: 2, maxLength: 5 }
          ),
          async (resourceTypes) => {
            const errors = resourceTypes.map(type => new NotFoundError(type));
            
            // All errors should have HTTP 404
            for (const error of errors) {
              expect(error.statusCode).toBe(404);
              expect(error.isOperational).toBe(true);
            }
            
            // All formatted responses should have HTTP 404
            const responses = errors.map(err => formatErrorResponse(err, false));
            for (const response of responses) {
              expect(response.error.statusCode).toBe(404);
              expect(response.error.code).toBe('NotFoundError');
              expect(response.error.message).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
