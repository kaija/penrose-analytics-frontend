/**
 * Error Handler Middleware for Next.js API Routes
 *
 * Provides middleware for handling errors in API routes and server actions,
 * with automatic error logging, status code mapping, and response formatting.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse, logError, AppError } from './errors';

/**
 * API route handler function type
 */
export type ApiHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with error handling
 *
 * Catches all errors thrown by the handler, logs them appropriately,
 * and returns a formatted error response with the correct HTTP status code.
 *
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with error handling
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */
export function withErrorHandler(
  handler: ApiHandler,
  options: { isAdminRoute?: boolean } = {}
): ApiHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Ensure error is an Error instance
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error with request context
      logError(err, {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      });

      // Format error response
      const isAdmin = options.isAdminRoute || false;
      const errorResponse = formatErrorResponse(err, isAdmin);

      // Return error response with appropriate status code
      return NextResponse.json(errorResponse, {
        status: errorResponse.error.statusCode,
      });
    }
  };
}

/**
 * Server action handler function type
 */
export type ServerAction<T = unknown> = (...args: any[]) => Promise<T>;

/**
 * Result type for server actions with error handling
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string; fields?: Record<string, string> } };

/**
 * Wrap a server action with error handling
 *
 * Catches all errors thrown by the action, logs them appropriately,
 * and returns a result object with success/error status.
 *
 * @param action - The server action function
 * @param options - Configuration options
 * @returns Wrapped action with error handling
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */
export function withServerActionErrorHandler<T>(
  action: ServerAction<T>,
  options: { isAdminAction?: boolean } = {}
): (...args: Parameters<typeof action>) => Promise<ActionResult<T>> {
  return async (...args: Parameters<typeof action>): Promise<ActionResult<T>> => {
    try {
      const result = await action(...args);
      return { success: true, data: result };
    } catch (error) {
      // Ensure error is an Error instance
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error
      logError(err, {
        action: action.name,
        args: args.map((arg) => (typeof arg === 'object' ? '[Object]' : arg)),
      });

      // Format error response
      const isAdmin = options.isAdminAction || false;
      const errorResponse = formatErrorResponse(err, isAdmin);

      return {
        success: false,
        error: {
          message: errorResponse.error.message,
          code: errorResponse.error.code,
          ...(errorResponse.error.fields && { fields: errorResponse.error.fields }),
        },
      };
    }
  };
}

/**
 * Create a standardized success response
 *
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with formatted success data
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Create a standardized error response
 *
 * @param error - The error to format
 * @param isAdmin - Whether the user is an admin
 * @returns NextResponse with formatted error data
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */
export function errorResponse(error: Error, isAdmin: boolean = false): NextResponse {
  const errorData = formatErrorResponse(error, isAdmin);
  return NextResponse.json(errorData, {
    status: errorData.error.statusCode,
  });
}

/**
 * Async error boundary for React Server Components
 *
 * Wraps a server component function with error handling that logs errors
 * and re-throws them for Next.js error boundaries to catch.
 *
 * @param component - The server component function
 * @returns Wrapped component with error logging
 */
export function withComponentErrorHandler<P extends Record<string, unknown>>(
  component: (props: P) => Promise<React.ReactElement>
): (props: P) => Promise<React.ReactElement> {
  return async (props: P) => {
    try {
      return await component(props);
    } catch (error) {
      // Ensure error is an Error instance
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error
      logError(err, {
        component: component.name,
        props: Object.keys(props),
      });

      // Re-throw for Next.js error boundary
      throw err;
    }
  };
}

/**
 * Check if an error is an operational error (safe to expose to users)
 *
 * @param error - The error to check
 * @returns true if the error is operational
 */
export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

/**
 * Get HTTP status code from an error
 *
 * @param error - The error to get status code from
 * @returns HTTP status code
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Default to 500 for unknown errors
  return 500;
}
