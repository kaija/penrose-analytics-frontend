/**
 * Unit tests for error handling system
 * 
 * Tests error classification, HTTP status code mapping, validation error formatting,
 * and error message sanitization.
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  createValidationError,
  formatErrorResponse,
  sanitizeErrorMessage,
  logError,
  validateRequiredFields,
  validateFieldTypes,
  validateStringLength,
  validateEmail,
} from '../../lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an operational error with status code', () => {
      const error = new AppError('Test error', 400, true);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should default to status 500 and operational true', () => {
      const error = new AppError('Test error');
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should include details when provided', () => {
      const details = { field: 'value' };
      const error = new AppError('Test error', 400, true, details);
      
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with HTTP 400', () => {
      const fields = { email: 'Invalid email format' };
      const error = new ValidationError('Validation failed', fields);
      
      expect(error.statusCode).toBe(400);
      expect(error.fields).toEqual(fields);
      expect(error.isOperational).toBe(true);
    });

    it('should work with empty fields', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.fields).toEqual({});
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with HTTP 401', () => {
      const error = new AuthenticationError();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with HTTP 403', () => {
      const error = new AuthorizationError();
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("You don't have permission to perform this action");
    });

    it('should accept custom message', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with HTTP 404', () => {
      const error = new NotFoundError('Project');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Project not found');
    });

    it('should use default resource name', () => {
      const error = new NotFoundError();
      
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with HTTP 409', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with HTTP 503', () => {
      const error = new DatabaseError();
      
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Database operation failed');
    });

    it('should include original error message in details', () => {
      const originalError = new Error('Connection timeout');
      const error = new DatabaseError('Database error', originalError);
      
      expect(error.details?.originalError).toBe('Connection timeout');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with HTTP 503', () => {
      const error = new ExternalServiceError('SMTP');
      
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('SMTP: Service temporarily unavailable');
    });
  });
});

describe('createValidationError', () => {
  it('should create validation error from field errors', () => {
    const fields = [
      { field: 'email', message: 'Invalid email' },
      { field: 'name', message: 'Name is required' },
    ];
    
    const error = createValidationError(fields);
    
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fields).toEqual({
      email: 'Invalid email',
      name: 'Name is required',
    });
    expect(error.message).toBe('Validation failed');
  });

  it('should use single field message for single error', () => {
    const fields = [{ field: 'email', message: 'Invalid email' }];
    
    const error = createValidationError(fields);
    
    expect(error.message).toBe('Invalid email');
  });
});

describe('sanitizeErrorMessage', () => {
  it('should return full message for admins', () => {
    const error = new Error('Database connection failed: timeout');
    
    const message = sanitizeErrorMessage(error, true);
    
    expect(message).toBe('Database connection failed: timeout');
  });

  it('should return operational error message for non-admins', () => {
    const error = new ValidationError('Invalid email format');
    
    const message = sanitizeErrorMessage(error, false);
    
    expect(message).toBe('Invalid email format');
  });

  it('should return generic message for non-operational errors', () => {
    const error = new Error('Internal error with sensitive details');
    
    const message = sanitizeErrorMessage(error, false);
    
    expect(message).toBe('An unexpected error occurred. Please try again later.');
  });
});

describe('formatErrorResponse', () => {
  it('should format AppError with status code', () => {
    const error = new ValidationError('Invalid input', { email: 'Invalid email' });
    
    const response = formatErrorResponse(error, false);
    
    expect(response.error.message).toBe('Invalid input');
    expect(response.error.code).toBe('ValidationError');
    expect(response.error.statusCode).toBe(400);
    expect(response.error.fields).toEqual({ email: 'Invalid email' });
  });

  it('should include details for admins', () => {
    const error = new AppError('Test error', 500, true, { debug: 'info' });
    
    const response = formatErrorResponse(error, true);
    
    expect(response.error.details).toEqual({ debug: 'info' });
  });

  it('should not include details for non-admins', () => {
    const error = new AppError('Test error', 500, true, { debug: 'info' });
    
    const response = formatErrorResponse(error, false);
    
    expect(response.error.details).toBeUndefined();
  });

  it('should handle generic errors with status 500', () => {
    const error = new Error('Unexpected error');
    
    const response = formatErrorResponse(error, false);
    
    expect(response.error.statusCode).toBe(500);
    expect(response.error.code).toBe('InternalServerError');
    expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
  });

  it('should handle Prisma unique constraint violation', () => {
    const prismaError: any = new Error('Unique constraint failed');
    prismaError.constructor = { name: 'PrismaClientKnownRequestError' };
    prismaError.code = 'P2002';
    prismaError.meta = { target: ['email'] };
    
    const response = formatErrorResponse(prismaError, false);
    
    expect(response.error.statusCode).toBe(409);
    expect(response.error.code).toBe('ConflictError');
    expect(response.error.fields).toEqual({ email: 'This email is already in use' });
  });

  it('should handle Prisma foreign key violation', () => {
    const prismaError: any = new Error('Foreign key constraint failed');
    prismaError.constructor = { name: 'PrismaClientKnownRequestError' };
    prismaError.code = 'P2003';
    
    const response = formatErrorResponse(prismaError, false);
    
    expect(response.error.statusCode).toBe(404);
    expect(response.error.message).toBe('Referenced resource not found');
  });

  it('should handle Prisma record not found', () => {
    const prismaError: any = new Error('Record not found');
    prismaError.constructor = { name: 'PrismaClientKnownRequestError' };
    prismaError.code = 'P2025';
    
    const response = formatErrorResponse(prismaError, false);
    
    expect(response.error.statusCode).toBe(404);
    expect(response.error.message).toBe('Resource not found');
  });

  it('should handle Prisma connection errors', () => {
    const prismaError: any = new Error('Cannot connect to database');
    prismaError.constructor = { name: 'PrismaClientInitializationError' };
    
    const response = formatErrorResponse(prismaError, false);
    
    expect(response.error.statusCode).toBe(503);
    expect(response.error.message).toBe('Service temporarily unavailable');
  });
});

describe('Validation Helpers', () => {
  describe('validateRequiredFields', () => {
    it('should pass when all required fields are present', () => {
      const data = { name: 'John', email: 'john@example.com' };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'email']);
      }).not.toThrow();
    });

    it('should throw ValidationError for missing fields', () => {
      const data = { name: 'John' };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'email']);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string fields', () => {
      const data = { name: '', email: 'john@example.com' };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'email']);
      }).toThrow(ValidationError);
    });

    it('should include all missing fields in error', () => {
      const data = {};
      
      try {
        validateRequiredFields(data, ['name', 'email']);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.fields).toHaveProperty('name');
        expect(validationError.fields).toHaveProperty('email');
      }
    });
  });

  describe('validateFieldTypes', () => {
    it('should pass when all field types are correct', () => {
      const data = { name: 'John', age: 30, active: true };
      
      expect(() => {
        validateFieldTypes(data, { name: 'string', age: 'number', active: 'boolean' });
      }).not.toThrow();
    });

    it('should throw ValidationError for incorrect types', () => {
      const data = { name: 'John', age: '30' };
      
      expect(() => {
        validateFieldTypes(data, { age: 'number' });
      }).toThrow(ValidationError);
    });

    it('should skip undefined/null values', () => {
      const data = { name: 'John', age: null };
      
      expect(() => {
        validateFieldTypes(data, { age: 'number' });
      }).not.toThrow();
    });
  });

  describe('validateStringLength', () => {
    it('should pass when string length is within constraints', () => {
      const data = { name: 'John Doe' };
      
      expect(() => {
        validateStringLength(data, { name: { min: 3, max: 50 } });
      }).not.toThrow();
    });

    it('should throw ValidationError for string too short', () => {
      const data = { name: 'Jo' };
      
      expect(() => {
        validateStringLength(data, { name: { min: 3 } });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for string too long', () => {
      const data = { name: 'A'.repeat(101) };
      
      expect(() => {
        validateStringLength(data, { name: { max: 100 } });
      }).toThrow(ValidationError);
    });

    it('should skip non-string values', () => {
      const data = { name: 123 };
      
      expect(() => {
        validateStringLength(data, { name: { min: 3 } });
      }).not.toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should pass for valid email addresses', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
      expect(() => validateEmail('test.user+tag@domain.co.uk')).not.toThrow();
    });

    it('should throw ValidationError for invalid email addresses', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError);
      expect(() => validateEmail('invalid@')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
      expect(() => validateEmail('user@domain')).toThrow(ValidationError);
    });

    it('should use custom field name in error', () => {
      try {
        validateEmail('invalid', 'userEmail');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.fields).toHaveProperty('userEmail');
      }
    });
  });
});

describe('logError', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should log operational errors at warn level', () => {
    const error = new ValidationError('Invalid input');
    
    logError(error);
    
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log non-operational errors at error level', () => {
    const error = new Error('Unexpected error');
    
    logError(error);
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should include context in log', () => {
    const error = new Error('Test error');
    const context = { userId: '123', action: 'test' };
    
    logError(error, context);
    
    const logCall = consoleErrorSpy.mock.calls[0];
    const logData = JSON.parse(logCall[1]);
    expect(logData.userId).toBe('123');
    expect(logData.action).toBe('test');
  });
});
