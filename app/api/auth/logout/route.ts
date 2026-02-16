/**
 * Logout Route
 * Destroys user session and redirects to login page
 * 
 * Requirements: 2.10, 15.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Destroy the session and clear cookies
    await destroySession();

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
    // Destroy the session and clear cookies
    await destroySession();

    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(
      new URL('/login?error=logout_failed', request.url)
    );
  }
}
