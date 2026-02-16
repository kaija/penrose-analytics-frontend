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

## Database

Database access is managed through Prisma ORM.

See `lib/prisma.ts` for the Prisma client instance.
