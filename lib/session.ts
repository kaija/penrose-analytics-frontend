import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

/**
 * Session data structure
 * Contains userId and activeProjectId for authenticated users
 */
export interface SessionData {
  userId: string;
  activeProjectId: string | null;
}

/**
 * Iron session configuration
 * Configures security attributes for session cookies
 */
const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'prism_session',
  cookieOptions: {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

/**
 * Get the current session from cookies
 * Returns an IronSession instance that can be used to read/write session data
 */
async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Create a new session for a user
 * Sets userId and activeProjectId in the session cookie
 * 
 * @param userId - The authenticated user's ID
 * @param activeProjectId - The user's active project ID (null for first-time users)
 * @returns Promise that resolves when session is saved
 * 
 * Requirements: 2.6, 2.7, 2.8, 2.9, 15.2
 */
export async function createSession(
  userId: string,
  activeProjectId: string | null
): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.activeProjectId = activeProjectId;
  await session.save();
}

/**
 * Validate and retrieve the current session
 * Returns session data if valid, null if invalid or expired
 * 
 * @returns Session data with userId and activeProjectId, or null if no valid session
 * 
 * Requirements: 15.3, 15.4
 */
export async function validateSession(): Promise<SessionData | null> {
  const session = await getSession();
  
  // Check if session has userId (required field)
  if (!session.userId) {
    return null;
  }
  
  return {
    userId: session.userId,
    activeProjectId: session.activeProjectId ?? null,
  };
}

/**
 * Destroy the current session
 * Clears all session data and removes the session cookie
 * 
 * @returns Promise that resolves when session is destroyed
 * 
 * Requirements: 2.10, 15.5
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * Update the active project in the current session
 * Used when a user switches between projects
 * 
 * @param projectId - The new active project ID
 * @returns Promise that resolves when session is updated
 * 
 * Requirements: 3.4
 */
export async function updateActiveProject(projectId: string): Promise<void> {
  const session = await getSession();
  
  if (!session.userId) {
    throw new Error('No active session');
  }
  
  session.activeProjectId = projectId;
  await session.save();
}
