/**
 * Property-based tests for input validation errors
 * 
 * Feature: prism
 * Testing Framework: fast-check
 * 
 * Tests that the system returns validation errors with specific field-level messages
 * for any request with invalid input data (missing required fields, wrong types, constraint violations).
 */

import * as fc from 'fast-check';
import {
  ValidationError,
  createValidationError,
  validateRequiredFields,
  validateFieldTypes,
  validateStringLength,
  validateEmail,
  formatErrorResponse,
} from '@/lib/errors';

describe('Input Validation Property Tests', () => {
  /**
   * Property 25: Input Validation Errors
   * 
   * For any request with invalid input data (missing required fields, wrong types, 
   * constraint violations), the system must return validation errors with specific 
   * field-level messages.
   * 
   * **Validates: Requirements 19.1**
   */
  describe('Property 25: Input validation errors', () => {
    test('Missing required fields return validation errors with field-level messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // required field names
          fc.record({}, { requiredKeys: [] }), // empty object (missing all fields)
          async (requiredFields, data) => {
            // Filter out problematic field names like __proto__, constructor, etc.
            const safeFields = requiredFields.filter(
              field => !['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'].includes(field)
            );
            
            if (safeFields.length === 0) {
              return; // Skip if no safe fields
            }
            
            // Ensure field names are unique
            const uniqueFields = [...new Set(safeFields)];
            
            try {
              validateRequiredFields(data, uniqueFields);
              // If no error thrown, all fields must have been present (shouldn't happen with empty object)
              expect(Object.keys(data).length).toBeGreaterThanOrEqual(uniqueFields.length);
            } catch (error) {
              // Requirement 19.1: System must return validation errors
              expect(error).toBeInstanceOf(ValidationError);
              const validationError = error as ValidationError;
              
              // Requirement 19.1: Errors must have specific field-level messages
              expect(validationError.fields).toBeDefined();
              expect(typeof validationError.fields).toBe('object');
              
              // Each missing field should have an error message
              for (const field of uniqueFields) {
                expect(validationError.fields[field]).toBeDefined();
                expect(typeof validationError.fields[field]).toBe('string');
                expect(validationError.fields[field].length).toBeGreaterThan(0);
                // Message should mention the field name
                expect(validationError.fields[field].toLowerCase()).toContain(field.toLowerCase());
              }
              
              // HTTP status code should be 400
              expect(validationError.statusCode).toBe(400);
              
              // Error should be operational
              expect(validationError.isOperational).toBe(true);
              
              // Format error response and verify structure
              const response = formatErrorResponse(validationError, false);
              expect(response.error.statusCode).toBe(400);
              expect(response.error.fields).toEqual(validationError.fields);
              expect(response.error.message).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Wrong field types return validation errors with field-level messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('string', 'number', 'boolean'), // expected type
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.anything()),
            fc.object()
          ), // actual value (may not match expected type)
          fc.string({ minLength: 1, maxLength: 50 }).filter(name => 
            name !== '__proto__' && name !== 'constructor' && name !== 'prototype'
          ), // field name
          async (expectedType, value, fieldName) => {
            const data = { [fieldName]: value };
            const fieldTypes = { [fieldName]: expectedType };
            
            const actualType = typeof value;
            
            // Skip if value is null/undefined (validateFieldTypes skips these)
            if (value === null || value === undefined) {
              validateFieldTypes(data, fieldTypes);
              return;
            }
            
            if (actualType !== expectedType) {
              try {
                validateFieldTypes(data, fieldTypes);
                fail('Should have thrown ValidationError');
              } catch (error) {
                // Requirement 19.1: System must return validation errors
                expect(error).toBeInstanceOf(ValidationError);
                const validationError = error as ValidationError;
                
                // Requirement 19.1: Errors must have specific field-level messages
                expect(validationError.fields).toBeDefined();
                expect(validationError.fields[fieldName]).toBeDefined();
                expect(typeof validationError.fields[fieldName]).toBe('string');
                
                // Message should mention the field name and expected type
                const message = validationError.fields[fieldName].toLowerCase();
                expect(message).toContain(fieldName.toLowerCase());
                expect(message).toContain(expectedType);
                
                // HTTP status code should be 400
                expect(validationError.statusCode).toBe(400);
                
                // Format error response and verify structure
                const response = formatErrorResponse(validationError, false);
                expect(response.error.statusCode).toBe(400);
                expect(response.error.fields).toEqual(validationError.fields);
              }
            } else {
              // Type matches, should not throw
              validateFieldTypes(data, fieldTypes);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('String length constraint violations return validation errors with field-level messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(), // string value
          fc.integer({ min: 1, max: 100 }), // min length
          fc.integer({ min: 1, max: 100 }), // max length
          fc.string({ minLength: 1, maxLength: 50 }), // field name
          async (value, minLength, maxLength) => {
            // Ensure min <= max
            const min = Math.min(minLength, maxLength);
            const max = Math.max(minLength, maxLength);
            
            const fieldName = 'testField';
            const data = { [fieldName]: value };
            const constraints = { [fieldName]: { min, max } };
            
            const isTooShort = value.length < min;
            const isTooLong = value.length > max;
            
            if (isTooShort || isTooLong) {
              try {
                validateStringLength(data, constraints);
                fail('Should have thrown ValidationError');
              } catch (error) {
                // Requirement 19.1: System must return validation errors
                expect(error).toBeInstanceOf(ValidationError);
                const validationError = error as ValidationError;
                
                // Requirement 19.1: Errors must have specific field-level messages
                expect(validationError.fields).toBeDefined();
                expect(validationError.fields[fieldName]).toBeDefined();
                expect(typeof validationError.fields[fieldName]).toBe('string');
                
                // Message should mention the field name and constraint
                const message = validationError.fields[fieldName].toLowerCase();
                expect(message).toContain(fieldName.toLowerCase());
                
                if (isTooShort) {
                  expect(message).toContain('at least');
                  expect(message).toContain(min.toString());
                } else {
                  expect(message).toContain('less than');
                  expect(message).toContain(max.toString());
                }
                
                // HTTP status code should be 400
                expect(validationError.statusCode).toBe(400);
                
                // Format error response and verify structure
                const response = formatErrorResponse(validationError, false);
                expect(response.error.statusCode).toBe(400);
                expect(response.error.fields).toEqual(validationError.fields);
              }
            } else {
              // Length is valid, should not throw
              validateStringLength(data, constraints);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Invalid email format returns validation error with field-level message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(), // potential email string
          fc.string({ minLength: 1, maxLength: 50 }), // field name
          async (emailValue, fieldName) => {
            // Simple email regex (same as in errors.ts)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValidEmail = emailRegex.test(emailValue);
            
            if (!isValidEmail) {
              try {
                validateEmail(emailValue, fieldName);
                fail('Should have thrown ValidationError');
              } catch (error) {
                // Requirement 19.1: System must return validation errors
                expect(error).toBeInstanceOf(ValidationError);
                const validationError = error as ValidationError;
                
                // Requirement 19.1: Errors must have specific field-level messages
                expect(validationError.fields).toBeDefined();
                expect(validationError.fields[fieldName]).toBeDefined();
                expect(typeof validationError.fields[fieldName]).toBe('string');
                
                // Message should indicate invalid email
                const message = validationError.fields[fieldName].toLowerCase();
                expect(message).toContain('email');
                
                // HTTP status code should be 400
                expect(validationError.statusCode).toBe(400);
                
                // Format error response and verify structure
                const response = formatErrorResponse(validationError, false);
                expect(response.error.statusCode).toBe(400);
                expect(response.error.fields).toEqual(validationError.fields);
              }
            } else {
              // Valid email, should not throw
              validateEmail(emailValue, fieldName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Multiple validation errors return all field-level messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              field: fc.string({ minLength: 1, maxLength: 50 }),
              message: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 2, maxLength: 5 }
          ), // multiple field errors
          async (fieldErrors) => {
            // Ensure field names are unique
            const uniqueErrors = fieldErrors.filter(
              (error, index, self) =>
                index === self.findIndex((e) => e.field === error.field)
            );
            
            if (uniqueErrors.length < 2) {
              return; // Skip if we don't have at least 2 unique errors
            }
            
            const validationError = createValidationError(uniqueErrors);
            
            // Requirement 19.1: System must return validation errors
            expect(validationError).toBeInstanceOf(ValidationError);
            
            // Requirement 19.1: Errors must have specific field-level messages
            expect(validationError.fields).toBeDefined();
            expect(Object.keys(validationError.fields).length).toBe(uniqueErrors.length);
            
            // Each field should have its corresponding error message
            for (const { field, message } of uniqueErrors) {
              expect(validationError.fields[field]).toBe(message);
            }
            
            // HTTP status code should be 400
            expect(validationError.statusCode).toBe(400);
            
            // Format error response and verify all fields are included
            const response = formatErrorResponse(validationError, false);
            expect(response.error.statusCode).toBe(400);
            expect(response.error.fields).toEqual(validationError.fields);
            expect(Object.keys(response.error.fields!).length).toBe(uniqueErrors.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Validation errors are operational and safe to expose to users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }), // error message
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ minLength: 1, maxLength: 200 })
          ), // field errors
          async (message, fields) => {
            const validationError = new ValidationError(message, fields);
            
            // Validation errors should be operational
            expect(validationError.isOperational).toBe(true);
            
            // Validation errors should have HTTP 400 status
            expect(validationError.statusCode).toBe(400);
            
            // Format error response for non-admin user
            const response = formatErrorResponse(validationError, false);
            
            // Message should be exposed to non-admin users (operational error)
            expect(response.error.message).toBe(message);
            
            // Fields should be included in response
            if (Object.keys(fields).length > 0) {
              expect(response.error.fields).toEqual(fields);
            }
            
            // Status code should be 400
            expect(response.error.statusCode).toBe(400);
            
            // Error code should be ValidationError
            expect(response.error.code).toBe('ValidationError');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Validation error response format is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              field: fc.string({ minLength: 1, maxLength: 50 }),
              message: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 5 }
          ), // field errors
          async (fieldErrors) => {
            // Ensure field names are unique
            const uniqueErrors = fieldErrors.filter(
              (error, index, self) =>
                index === self.findIndex((e) => e.field === error.field)
            );
            
            if (uniqueErrors.length === 0) {
              return;
            }
            
            const validationError = createValidationError(uniqueErrors);
            const response = formatErrorResponse(validationError, false);
            
            // Response must have error object
            expect(response.error).toBeDefined();
            
            // Error object must have required fields
            expect(response.error.message).toBeDefined();
            expect(typeof response.error.message).toBe('string');
            
            expect(response.error.code).toBeDefined();
            expect(response.error.code).toBe('ValidationError');
            
            expect(response.error.statusCode).toBeDefined();
            expect(response.error.statusCode).toBe(400);
            
            // Fields must be present for validation errors
            expect(response.error.fields).toBeDefined();
            expect(typeof response.error.fields).toBe('object');
            
            // All field errors must be included
            for (const { field, message } of uniqueErrors) {
              expect(response.error.fields![field]).toBe(message);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
