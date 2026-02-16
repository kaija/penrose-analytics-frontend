# Prism CDP - Library Documentation

## Authentication & OAuth

### Google OAuth Flow

The application uses Google OAuth 2.0 for authentication. The flow is implemented manually without using next-auth.

#### Configuration

OAuth configuration is managed through environment variables:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APP_BASE_URL="http://localhost:3000"
```

#### Flow Overview

1. **Login Initiation** (`/api/auth/login`)
   - Generates a random state parameter for CSRF protection
   - Stores state in a secure cookie
   - Redirects user to Google OAuth authorization endpoint

2. **Google Authorization**
   - User authenticates with Google
   - User grants permissions (email, profile)
   - Google redirects back to callback URL with authorization code

3. **Callback Handling** (`/api/auth/callback/google`)
   - Validates state parameter (CSRF protection)
   - Exchanges authorization code for access token
   - Fetches user information from Google
   - Creates or updates user record in database
   - Creates secure session with iron-session
   - Redirects to onboarding (new users) or home (existing users)

#### Files

- `lib/oauth.ts` - OAuth configuration and utility functions
- `app/api/auth/login/route.ts` - Login initiation endpoint
- `app/api/auth/callback/google/route.ts` - OAuth callback handler
- `app/login/page.tsx` - Login page UI
- `app/onboarding/page.tsx` - First-time user onboarding

#### Security Features

- **CSRF Protection**: State parameter validation
- **Secure Cookies**: httpOnly, secure (in production), sameSite=lax
- **Email Verification**: Ensures email is provided by Google
- **Session Management**: Secure session cookies with iron-session

#### Testing

OAuth configuration and utilities are tested in `__tests__/oauth/oauth.test.ts`.

## Session Management

Session management is implemented using iron-session with secure cookie configuration.

See `lib/session.ts` for implementation details.

### Session Data Structure

```typescript
interface SessionData {
  userId: string;
  activeProjectId: string | null;
}
```

### Functions

- `createSession(userId, activeProjectId)` - Create new session
- `validateSession()` - Validate and retrieve current session
- `destroySession()` - Destroy session and clear cookies
- `updateActiveProject(projectId)` - Update active project in session

## Project Management

Project management functionality handles project creation, access control, and user-project relationships.

See `lib/project.ts` for implementation details.

### Functions

- `createProject(userId, name)` - Create new project and assign creator as owner
- `getUserProjects(userId)` - Get all projects for a user
- `switchProject(userId, projectId)` - Validate access for project switching
- `hasProjectAccess(userId, projectId)` - Check if user has access to project
- `getUserRole(userId, projectId)` - Get user's role in a project

### Key Features

- **Transactional Creation**: Projects and owner memberships are created atomically
- **Access Control**: All operations validate user access before proceeding
- **Role Management**: Supports owner, admin, editor, and viewer roles
- **Multi-Project Support**: Users can be members of multiple projects with different roles

### Testing

Project management is tested in:
- `__tests__/project/project.test.ts` - Unit tests for specific scenarios
- `__tests__/project/project.property.test.ts` - Property-based tests for correctness

## Email Delivery

Email delivery is implemented using nodemailer with SMTP configuration and automatic retry logic.

See `lib/email.ts` for implementation details.

### Configuration

SMTP configuration is managed through environment variables:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="noreply@example.com"
```

### Functions

- `sendEmail(options)` - Send an email with automatic retry logic
- `verifyEmailConnection()` - Verify SMTP connection configuration

### Retry Logic

The email system implements automatic retry logic for failed deliveries:

- **Max Retries**: 3 attempts
- **Retry Delays**: 1 minute, 5 minutes, 15 minutes (exponential backoff)
- **Logging**: All failures and retries are logged for monitoring
- **Permanent Failure**: After 3 failed attempts, the email is marked as permanently failed

### Email Options

```typescript
interface EmailOptions {
  to: string;        // Recipient email address
  subject: string;   // Email subject line
  text: string;      // Plain text email body
  html?: string;     // Optional HTML email body
}
```

### Usage Example

```typescript
import { sendEmail } from '@/lib/email';

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Prism',
  text: 'Welcome to our platform!',
  html: '<p>Welcome to our platform!</p>',
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Security Features

- **Environment-based Configuration**: All credentials stored in environment variables
- **Connection Pooling**: Reuses transporter instance for efficiency
- **Error Handling**: Comprehensive error logging without exposing sensitive details
- **Secure Transport**: Supports TLS/SSL for secure email delivery

### Testing

Email delivery will be tested in `__tests__/email/email.test.ts`.

## Database

Database access is managed through Prisma ORM.

See `lib/prisma.ts` for the Prisma client instance.
