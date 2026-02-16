/**
 * Error Handling Module
 * 
 * Provides custom error classes, error classification, HTTP status code mapping,
 * validation error formatting, and security-conscious error message sanitization.
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 * HTTP 400 Bad Request
 * 
 * Requirements: 19.1
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, true, { fields });
    this.fields = fields;
  }
}

/**
 * Authentication error for missing or invalid authentication
 * HTTP 401 Unauthorized
 * 
 * Requirements: 2.10, 15.4
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true);
  }
}

/**
 * Authorization error for insufficient permissions
 * HTTP 403 Forbidden
 * 
 * Requirements: 4.10, 19.3
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, 403, true);
  }
}

/**
 * Not found error for missing resources
 * HTTP 404 Not Found
 * 
 * Requirements: 19.4
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true);
  }
}

/**
 * Conflict error for duplicate or conflicting resources
 * HTTP 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true);
  }
}

/**
 * Database error for database operation failures
 * HTTP 503 Service Unavailable
 * 
 * Requirements: 19.2
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(message, 503, true, { originalError: originalError?.message });
  }
}

/**
 * External service error for third-party service failures
 * HTTP 503 Service Unavailable
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'Service temporarily unavailable') {
    super(`${service}: ${message}`, 503, true);
  }
}

/**
 * Field validation error details
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Create a validation error with field-specific messages
 * 
 * @param fields - Array of field errors
 * @returns ValidationError with formatted field messages
 * 
 * Requirements: 19.1
 */
export function createValidationError(fields: FieldError[]): ValidationError {
  const fieldMap: Record<string, string> = {};
  fields.forEach(({ field, message }) => {
    fieldMap[field] = message;
  });

  const message = fields.length === 1
    ? fields[0].message
    : 'Validation failed';

  return new ValidationError(message, fieldMap);
}

/**
 * Error response format for API responses
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    fields?: Record<string, string>;
    details?: Record<string, unknown>;
  };
}

/**
 * Sanitize error message for non-admin users
 * Removes sensitive implementation details like stack traces, database errors, internal paths
 * 
 * @param error - The error to sanitize
 * @param isAdmin - Whether the user is an admin
 * @returns Sanitized error message
 * 
 * Requirements: 19.6
 */
export function sanitizeErrorMessage(error: Error, isAdmin: boolean = false): string {
  // If admin, return full error message
  if (isAdmin) {
    return error.message;
  }

  // For operational errors (AppError), return the message as-is
  // These are designed to be user-friendly
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  // For non-operational errors, return generic message
  // This prevents leaking sensitive information
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Format error for API response
 * Maps errors to HTTP status codes and formats validation errors with field details
 * 
 * @param error - The error to format
 * @param isAdmin - Whether the user is an admin (for error detail exposure)
 * @returns Formatted error response
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */
export function formatErrorResponse(error: Error, isAdmin: boolean = false): ErrorResponse {
  // Handle AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        message: sanitizeErrorMessage(error, isAdmin),
        code: error.name,
        statusCode: error.statusCode,
      },
    };

    // Include field details for validation errors
    if (error instanceof ValidationError && Object.keys(error.fields).length > 0) {
      response.error.fields = error.fields;
    }

    // Include additional details for admins
    if (isAdmin && error.details) {
      response.error.details = error.details;
    }

    return response;
  }

  // Handle Prisma errors
  if (error.constructor.name.startsWith('Prisma')) {
    return handlePrismaError(error, isAdmin);
  }

  // Handle generic errors
  // Requirements: 19.5
  return {
    error: {
      message: sanitizeErrorMessage(error, isAdmin),
      code: 'InternalServerError',
      statusCode: 500,
      ...(isAdmin && { details: { originalMessage: error.message } }),
    },
  };
}

/**
 * Handle Prisma-specific errors and map to appropriate error types
 * 
 * @param error - The Prisma error
 * @param isAdmin - Whether the user is an admin
 * @returns Formatted error response
 * 
 * Requirements: 19.2
 */
function handlePrismaError(error: Error, isAdmin: boolean): ErrorResponse {
  const errorName = error.constructor.name;
  
  // Prisma unique constraint violation
  if (errorName === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      // Unique constraint violation
      const fields = prismaError.meta?.target || [];
      const fieldName = Array.isArray(fields) ? fields[0] : 'field';
      
      return {
        error: {
          message: `A record with this ${fieldName} already exists`,
          code: 'ConflictError',
          statusCode: 409,
          fields: { [fieldName]: `This ${fieldName} is already in use` },
        },
      };
    }
    
    if (prismaError.code === 'P2003') {
      // Foreign key constraint violation
      return {
        error: {
          message: 'Referenced resource not found',
          code: 'NotFoundError',
          statusCode: 404,
        },
      };
    }
    
    if (prismaError.code === 'P2025') {
      // Record not found
      return {
        error: {
          message: 'Resource not found',
          code: 'NotFoundError',
          statusCode: 404,
        },
      };
    }
  }
  
  // Prisma connection errors
  if (errorName === 'PrismaClientInitializationError' || errorName === 'PrismaClientRustPanicError') {
    return {
      error: {
        message: 'Service temporarily unavailable',
        code: 'DatabaseError',
        statusCode: 503,
        ...(isAdmin && { details: { originalMessage: error.message } }),
      },
    };
  }
  
  // Generic Prisma error
  return {
    error: {
      message: isAdmin ? error.message : 'Database operation failed',
      code: 'DatabaseError',
      statusCode: 503,
      ...(isAdmin && { details: { originalMessage: error.message } }),
    },
  };
}

/**
 * Log error with appropriate level based on error type
 * 
 * @param error - The error to log
 * @param context - Additional context for logging
 * 
 * Requirements: 19.2, 19.5
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  const isOperational = error instanceof AppError && error.isOperational;
  
  // Log operational errors at warn level
  // Log non-operational errors at error level
  const logLevel = isOperational ? 'warn' : 'error';
  
  const logData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && { statusCode: error.statusCode }),
    ...(error instanceof AppError && error.details && { details: error.details }),
    ...context,
  };
  
  if (logLevel === 'error') {
    console.error('[ERROR]', JSON.stringify(logData, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(logData, null, 2));
  }
}

/**
 * Validate required fields in an object
 * 
 * @param data - The data object to validate
 * @param requiredFields - Array of required field names
 * @throws ValidationError if any required fields are missing
 * 
 * Requirements: 19.1
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  const errors: FieldError[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `Field '${field}' is required`,
      });
    }
  }
  
  if (errors.length > 0) {
    throw createValidationError(errors);
  }
}

/**
 * Validate field types in an object
 * 
 * @param data - The data object to validate
 * @param fieldTypes - Map of field names to expected types
 * @throws ValidationError if any fields have incorrect types
 * 
 * Requirements: 19.1
 */
export function validateFieldTypes(
  data: Record<string, unknown>,
  fieldTypes: Record<string, string>
): void {
  const errors: FieldError[] = [];
  
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    const value = data[field];
    
    if (value === undefined || value === null) {
      continue; // Skip undefined/null values (use validateRequiredFields for required checks)
    }
    
    const actualType = typeof value;
    
    if (actualType !== expectedType) {
      errors.push({
        field,
        message: `Field '${field}' must be ${expectedType}`,
      });
    }
  }
  
  if (errors.length > 0) {
    throw createValidationError(errors);
  }
}

/**
 * Validate string length constraints
 * 
 * @param data - The data object to validate
 * @param constraints - Map of field names to min/max length constraints
 * @throws ValidationError if any fields violate length constraints
 * 
 * Requirements: 19.1
 */
export function validateStringLength(
  data: Record<string, unknown>,
  constraints: Record<string, { min?: number; max?: number }>
): void {
  const errors: FieldError[] = [];
  
  for (const [field, { min, max }] of Object.entries(constraints)) {
    const value = data[field];
    
    if (typeof value !== 'string') {
      continue; // Skip non-string values
    }
    
    if (min !== undefined && value.length < min) {
      errors.push({
        field,
        message: `Field '${field}' must be at least ${min} characters`,
      });
    }
    
    if (max !== undefined && value.length > max) {
      errors.push({
        field,
        message: `Field '${field}' must be less than ${max} characters`,
      });
    }
  }
  
  if (errors.length > 0) {
    throw createValidationError(errors);
  }
}

/**
 * Validate email format
 * 
 * @param email - The email address to validate
 * @param fieldName - The field name for error messages
 * @throws ValidationError if email format is invalid
 * 
 * Requirements: 19.1
 */
export function validateEmail(email: string, fieldName: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw createValidationError([
      {
        field: fieldName,
        message: 'Invalid email address',
      },
    ]);
  }
}
