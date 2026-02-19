/**
 * Logout Route
 * Destroys user session and redirects to login page
 *
 * Requirements: 2.10, 15.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession, validateSession } from '@/lib/session';
import { createAuditLog, getIpAddress, getUserAgent } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    // Get session before destroying it
    const session = await validateSession();

    // Destroy the session and clear cookies
    await destroySession();

    // Log logout if we had a valid session
    if (session) {
      await createAuditLog(
        session.userId,
        'auth.logout',
        {
          resourceType: 'authentication',
          ipAddress: getIpAddress(request.headers),
          userAgent: getUserAgent(request.headers),
        }
      );
    }

    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

/**
 * Support GET requests for logout as well
 * This allows simple link-based logout (e.g., <a href="/api/auth/logout">)
 */
export async function GET(request: NextRequest) {
  try {
    // Get session before destroying it
    const session = await validateSession();

    // Destroy the session and clear cookies
    await destroySession();

    // Log logout if we had a valid session
    if (session) {
      await createAuditLog(
        session.userId,
        'auth.logout',
        {
          resourceType: 'authentication',
          ipAddress: getIpAddress(request.headers),
          userAgent: getUserAgent(request.headers),
        }
      );
    }

    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(
      new URL('/login?error=logout_failed', request.url)
    );
  }
}
