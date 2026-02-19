/**
 * Unit tests for error handler middleware
 *
 * Tests API route error handling, server action error handling,
 * and response formatting.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  withServerActionErrorHandler,
  successResponse,
  errorResponse,
  isOperationalError,
  getErrorStatusCode,
} from '../../lib/error-handler';
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  AppError,
} from '../../lib/errors';

// Mock console methods
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

describe('withErrorHandler', () => {
  it('should return handler result when no error occurs', async () => {
    const handler = jest.fn().mockResolvedValue(
      NextResponse.json({ data: 'success' })
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(handler).toHaveBeenCalledWith(request, undefined);
    expect(data).toEqual({ data: 'success' });
  });

  it('should catch and format ValidationError', async () => {
    const handler = jest.fn().mockRejectedValue(
      new ValidationError('Invalid input', { email: 'Invalid email' })
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.message).toBe('Invalid input');
    expect(data.error.code).toBe('ValidationError');
    expect(data.error.fields).toEqual({ email: 'Invalid email' });
  });

  it('should catch and format AuthorizationError', async () => {
    const handler = jest.fn().mockRejectedValue(
      new AuthorizationError('Insufficient permissions')
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.message).toBe('Insufficient permissions');
    expect(data.error.code).toBe('AuthorizationError');
  });

  it('should catch and format NotFoundError', async () => {
    const handler = jest.fn().mockRejectedValue(
      new NotFoundError('Project')
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.message).toBe('Project not found');
    expect(data.error.code).toBe('NotFoundError');
  });

  it('should catch and format generic errors', async () => {
    const handler = jest.fn().mockRejectedValue(
      new Error('Unexpected error')
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('InternalServerError');
    expect(data.error.message).toBe('An unexpected error occurred. Please try again later.');
  });

  it('should log errors with request context', async () => {
    const handler = jest.fn().mockRejectedValue(
      new Error('Test error')
    );

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    });

    await wrappedHandler(request);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0];
    const logData = JSON.parse(logCall[1]);
    expect(logData.method).toBe('POST');
    expect(logData.url).toBe('http://localhost/api/test');
  });

  it('should expose details for admin routes', async () => {
    const handler = jest.fn().mockRejectedValue(
      new AppError('Test error', 500, true, { debug: 'info' })
    );

    const wrappedHandler = withErrorHandler(handler, { isAdminRoute: true });
    const request = new NextRequest('http://localhost/api/admin/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(data.error.details).toEqual({ debug: 'info' });
  });

  it('should not expose details for non-admin routes', async () => {
    const handler = jest.fn().mockRejectedValue(
      new AppError('Test error', 500, true, { debug: 'info' })
    );

    const wrappedHandler = withErrorHandler(handler, { isAdminRoute: false });
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(data.error.details).toBeUndefined();
  });

  it('should handle non-Error thrown values', async () => {
    const handler = jest.fn().mockRejectedValue('String error');

    const wrappedHandler = withErrorHandler(handler);
    const request = new NextRequest('http://localhost/api/test');

    const response = await wrappedHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('InternalServerError');
  });
});

describe('withServerActionErrorHandler', () => {
  it('should return success result when no error occurs', async () => {
    const action = jest.fn().mockResolvedValue({ id: '123', name: 'Test' });

    const wrappedAction = withServerActionErrorHandler(action);
    const result = await wrappedAction('arg1', 'arg2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: '123', name: 'Test' });
    }
  });

  it('should return error result for ValidationError', async () => {
    const action = jest.fn().mockRejectedValue(
      new ValidationError('Invalid input', { email: 'Invalid email' })
    );

    const wrappedAction = withServerActionErrorHandler(action);
    const result = await wrappedAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid input');
      expect(result.error.code).toBe('ValidationError');
      expect(result.error.fields).toEqual({ email: 'Invalid email' });
    }
  });

  it('should return error result for AuthorizationError', async () => {
    const action = jest.fn().mockRejectedValue(
      new AuthorizationError('Insufficient permissions')
    );

    const wrappedAction = withServerActionErrorHandler(action);
    const result = await wrappedAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Insufficient permissions');
      expect(result.error.code).toBe('AuthorizationError');
    }
  });

  it('should return error result for generic errors', async () => {
    const action = jest.fn().mockRejectedValue(
      new Error('Unexpected error')
    );

    const wrappedAction = withServerActionErrorHandler(action);
    const result = await wrappedAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('InternalServerError');
      expect(result.error.message).toBe('An unexpected error occurred. Please try again later.');
    }
  });

  it('should log errors with action context', async () => {
    const action = jest.fn().mockRejectedValue(
      new Error('Test error')
    );

    const wrappedAction = withServerActionErrorHandler(action);
    await wrappedAction('arg1', 123);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0];
    const logData = JSON.parse(logCall[1]);
    expect(logData.args).toBeDefined();
  });

  it('should handle non-Error thrown values', async () => {
    const action = jest.fn().mockRejectedValue('String error');

    const wrappedAction = withServerActionErrorHandler(action);
    const result = await wrappedAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('InternalServerError');
    }
  });
});

describe('successResponse', () => {
  it('should create success response with default status 200', () => {
    const response = successResponse({ id: '123', name: 'Test' });

    expect(response.status).toBe(200);
  });

  it('should create success response with custom status', () => {
    const response = successResponse({ id: '123' }, 201);

    expect(response.status).toBe(201);
  });

  it('should format data correctly', async () => {
    const response = successResponse({ id: '123', name: 'Test' });
    const data = await response.json();

    expect(data).toEqual({ data: { id: '123', name: 'Test' } });
  });
});

describe('errorResponse', () => {
  it('should create error response with correct status', () => {
    const error = new ValidationError('Invalid input');
    const response = errorResponse(error);

    expect(response.status).toBe(400);
  });

  it('should format error correctly', async () => {
    const error = new NotFoundError('Project');
    const response = errorResponse(error);
    const data = await response.json();

    expect(data.error.message).toBe('Project not found');
    expect(data.error.code).toBe('NotFoundError');
    expect(data.error.statusCode).toBe(404);
  });

  it('should respect admin flag', async () => {
    const error = new AppError('Test error', 500, true, { debug: 'info' });

    const adminResponse = errorResponse(error, true);
    const adminData = await adminResponse.json();
    expect(adminData.error.details).toEqual({ debug: 'info' });

    const userResponse = errorResponse(error, false);
    const userData = await userResponse.json();
    expect(userData.error.details).toBeUndefined();
  });
});

describe('isOperationalError', () => {
  it('should return true for operational AppError', () => {
    const error = new ValidationError('Invalid input');

    expect(isOperationalError(error)).toBe(true);
  });

  it('should return false for non-operational AppError', () => {
    const error = new AppError('Test error', 500, false);

    expect(isOperationalError(error)).toBe(false);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Test error');

    expect(isOperationalError(error)).toBe(false);
  });
});

describe('getErrorStatusCode', () => {
  it('should return status code from AppError', () => {
    const error = new ValidationError('Invalid input');

    expect(getErrorStatusCode(error)).toBe(400);
  });

  it('should return 500 for generic Error', () => {
    const error = new Error('Test error');

    expect(getErrorStatusCode(error)).toBe(500);
  });
});

describe('Error Handling - Database and Server Errors', () => {
  describe('Database failure handling', () => {
    it('should return 503 for database connection failure', async () => {
      const handler = jest.fn().mockRejectedValue(
        new Error('Cannot connect to database')
      );
      handler.mockImplementation(() => {
        const error: any = new Error('Cannot connect to database');
        error.constructor = { name: 'PrismaClientInitializationError' };
        throw error;
      });

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest('http://localhost/api/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('DatabaseError');
      expect(data.error.message).toBe('Service temporarily unavailable');
    });

    it('should return 503 for database operation failure', async () => {
      const handler = jest.fn().mockImplementation(() => {
        const error: any = new Error('Database query timeout');
        error.constructor = { name: 'PrismaClientRustPanicError' };
        throw error;
      });

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest('http://localhost/api/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('DatabaseError');
    });

    it('should return 503 for DatabaseError', async () => {
      const handler = jest.fn().mockRejectedValue(
        new (require('../../lib/errors').DatabaseError)('Database connection lost')
      );

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest('http://localhost/api/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toBe('Database connection lost');
      expect(data.error.code).toBe('DatabaseError');
    });
  });

  describe('Server error handling', () => {
    it('should return 500 for unexpected server errors', async () => {
      const handler = jest.fn().mockRejectedValue(
        new Error('Unexpected internal error')
      );

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest('http://localhost/api/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.statusCode).toBe(500);
      expect(data.error.code).toBe('InternalServerError');
    });

    it('should log server errors with full details', async () => {
      const testError = new Error('Critical server error');
      const handler = jest.fn().mockRejectedValue(testError);

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      await wrappedHandler(request);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toBe('[ERROR]');

      // Verify log contains error details
      const logData = JSON.parse(logCall[1]);
      expect(logData.name).toBe('Error');
      expect(logData.message).toBe('Critical server error');
      expect(logData.stack).toBeDefined();
      expect(logData.method).toBe('POST');
      expect(logData.url).toBe('http://localhost/api/test');
    });

    it('should log server errors in server actions', async () => {
      const testError = new Error('Server action failed');
      const action = jest.fn().mockRejectedValue(testError);

      const wrappedAction = withServerActionErrorHandler(action);
      await wrappedAction('arg1', 'arg2');

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toBe('[ERROR]');

      // Verify log contains error details
      const logData = JSON.parse(logCall[1]);
      expect(logData.message).toBe('Server action failed');
      expect(logData.stack).toBeDefined();
    });

    it('should sanitize error messages for non-admin users', async () => {
      const handler = jest.fn().mockRejectedValue(
        new Error('Internal error: database password is abc123')
      );

      const wrappedHandler = withErrorHandler(handler, { isAdminRoute: false });
      const request = new NextRequest('http://localhost/api/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      // Should not expose internal error details to non-admin
      expect(data.error.message).toBe('An unexpected error occurred. Please try again later.');
      expect(data.error.message).not.toContain('password');
      expect(data.error.message).not.toContain('abc123');
    });

    it('should expose error details for admin users', async () => {
      const handler = jest.fn().mockRejectedValue(
        new Error('Internal error with details')
      );

      const wrappedHandler = withErrorHandler(handler, { isAdminRoute: true });
      const request = new NextRequest('http://localhost/api/admin/test');

      const response = await wrappedHandler(request);
      const data = await response.json();

      // Admin should see the actual error message
      expect(data.error.message).toBe('Internal error with details');
      expect(data.error.details).toBeDefined();
      expect(data.error.details.originalMessage).toBe('Internal error with details');
    });
  });
});
