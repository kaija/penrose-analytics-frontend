/**
 * OAuth Login Route
 * Initiates Google OAuth flow by redirecting to Google authorization endpoint
 *
 * Requirements: 2.1, 2.2
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGoogleAuthorizationUrl, generateState } from '@/lib/oauth';

export async function GET() {
  try {
    // Generate state parameter for CSRF protection
    const state = generateState();

    // Store state in cookie for validation in callback
    const cookieStore = await cookies();
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Generate Google authorization URL
    const authUrl = getGoogleAuthorizationUrl(state);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
