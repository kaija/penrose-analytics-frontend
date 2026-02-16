# Error Handling System

This document describes the global error handling system implemented for the Prism CDP platform.

## Overview

The error handling system provides:
- Custom error classes for different error types
- HTTP status code mapping
- Validation error formatting with field details
- Security-conscious error message sanitization
- Middleware for API routes and server actions
- Comprehensive logging

## Files

- `lib/errors.ts` - Core error classes and utilities
- `lib/error-handler.ts` - Middleware for Next.js routes and server actions
- `__tests__/errors/errors.test.ts` - Unit tests for error classes
- `__tests__/errors/error-handler.test.ts` - Unit tests for middleware

## Error Classes

### AppError (Base Class)
Base class for all application errors. Includes:
- `statusCode` - HTTP status code
- `isOperational` - Whether error is expected/operational
- `details` - Additional error context

### ValidationError (400)
For invalid input data. Includes field-specific error messages.

```typescript
throw new ValidationError('Invalid input', {
  email: 'Invalid email format',
  name: 'Name is required'
});
```

### AuthenticationError (401)
For missing or invalid authentication.

```typescript
throw new AuthenticationError('Invalid token');
```

### AuthorizationError (403)
For insufficient permissions.

```typescript
throw new AuthorizationError('Insufficient permissions');
```

### NotFoundError (404)
For missing resources.

```typescript
throw new NotFoundError('Project');
// Returns: "Project not found"
```

### ConflictError (409)
For duplicate or conflicting resources.

```typescript
throw new ConflictError('Email already exists');
```

### DatabaseError (503)
For database operation failures.

```typescript
throw new DatabaseError('Connection timeout', originalError);
```

### ExternalServiceError (503)
For third-party service failures.

```typescript
throw new ExternalServiceError('SMTP', 'Connection failed');
```

## Validation Helpers

### validateRequiredFields
Validates that required fields are present and non-empty.

```typescript
validateRequiredFields(data, ['name', 'email']);
```

### validateFieldTypes
Validates that fields have the correct types.

```typescript
validateFieldTypes(data, {
  name: 'string',
  age: 'number',
  active: 'boolean'
});
```

### validateStringLength
Validates string length constraints.

```typescript
validateStringLength(data, {
  name: { min: 3, max: 100 },
  description: { max: 500 }
});
```

### validateEmail
Validates email format.

```typescript
validateEmail('user@example.com', 'email');
```

## Middleware

### withErrorHandler (API Routes)
Wraps API route handlers with error handling.

```typescript
import { withErrorHandler } from '@/lib/error-handler';

export const GET = withErrorHandler(async (request) => {
  // Your handler code
  return NextResponse.json({ data: 'success' });
});

// For admin routes with detailed errors
export const GET = withErrorHandler(async (request) => {
  // Your handler code
}, { isAdminRoute: true });
```

### withServerActionErrorHandler (Server Actions)
Wraps server actions with error handling.

```typescript
import { withServerActionErrorHandler } from '@/lib/error-handler';

export const createProject = withServerActionErrorHandler(
  async (name: string) => {
    // Your action code
    return project;
  }
);

// Returns: { success: true, data: project }
// Or: { success: false, error: { message, code, fields? } }
```

## Error Response Format

All errors are formatted consistently:

```json
{
  "error": {
    "message": "Invalid input",
    "code": "ValidationError",
    "statusCode": 400,
    "fields": {
      "email": "Invalid email format"
    }
  }
}
```

## Error Message Sanitization

The system automatically sanitizes error messages for non-admin users:

- **Operational errors** (ValidationError, AuthorizationError, etc.) - Full message shown
- **Non-operational errors** (unexpected errors) - Generic message shown
- **Admin users** - Full error details including stack traces
- **Regular users** - Sanitized messages without sensitive details

## Prisma Error Handling

The system automatically handles Prisma errors:

- **P2002** (Unique constraint) → 409 Conflict with field details
- **P2003** (Foreign key) → 404 Not Found
- **P2025** (Record not found) → 404 Not Found
- **Connection errors** → 503 Service Unavailable

## Logging

Errors are automatically logged with appropriate levels:

- **Operational errors** → `warn` level
- **Non-operational errors** → `error` level

Logs include:
- Error name and message
- Stack trace
- Status code (for AppError)
- Request context (method, URL, headers)
- Additional context provided

## Usage Examples

### API Route with Validation

```typescript
import { withErrorHandler } from '@/lib/error-handler';
import { validateRequiredFields, validateEmail } from '@/lib/errors';

export const POST = withErrorHandler(async (request) => {
  const data = await request.json();
  
  // Validate required fields
  validateRequiredFields(data, ['name', 'email']);
  
  // Validate email format
  validateEmail(data.email);
  
  // Create resource
  const result = await createResource(data);
  
  return NextResponse.json({ data: result });
});
```

### Server Action with Error Handling

```typescript
'use server';

import { withServerActionErrorHandler } from '@/lib/error-handler';
import { AuthorizationError, NotFoundError } from '@/lib/errors';

export const updateProject = withServerActionErrorHandler(
  async (projectId: string, updates: ProjectUpdates) => {
    // Check permissions
    const hasPermission = await checkPermission(userId, projectId);
    if (!hasPermission) {
      throw new AuthorizationError('Insufficient permissions');
    }
    
    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updates
    });
    
    if (!project) {
      throw new NotFoundError('Project');
    }
    
    return project;
  }
);
```

### Business Logic with Custom Errors

```typescript
import { ValidationError, NotFoundError } from '@/lib/errors';

export async function removeProjectMember(membershipId: string) {
  const membership = await prisma.projectMembership.findUnique({
    where: { id: membershipId }
  });
  
  if (!membership) {
    throw new NotFoundError('Membership');
  }
  
  // Check if last owner
  if (membership.role === 'owner') {
    const ownerCount = await countOwners(membership.projectId);
    if (ownerCount <= 1) {
      throw new ValidationError('Cannot remove the last owner');
    }
  }
  
  await prisma.projectMembership.delete({
    where: { id: membershipId }
  });
}
```

## Testing

The error handling system includes comprehensive tests:

- 45 tests for error classes and utilities
- 26 tests for middleware
- All tests passing

Run tests:
```bash
npm test -- __tests__/errors/
```

## Requirements Validated

This implementation validates the following requirements:

- **19.1** - Validation errors with field-specific messages
- **19.2** - Database error handling with user-friendly messages
- **19.3** - Authorization errors with HTTP 403
- **19.4** - Not found errors with HTTP 404
- **19.5** - Server errors with HTTP 500 and logging
- **19.6** - Error message sanitization for non-admins

## Integration

The error handling system has been integrated into:

- `lib/rbac.ts` - Authorization errors
- `lib/project.ts` - Project management errors
- `lib/invitation.ts` - Invitation errors

All existing tests have been updated and are passing.
