/**
 * OAuth Callback Route
 * Handles Google OAuth callback, exchanges code for token, and creates user session
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForToken,
  getGoogleUserInfo,
  GoogleUserInfo,
} from '@/lib/oauth';
import { createSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_request', request.url)
      );
    }

    // Validate state parameter (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;

    if (!storedState || storedState !== state) {
      console.error('State mismatch:', { storedState, receivedState: state });
      return NextResponse.redirect(
        new URL('/login?error=state_mismatch', request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete('oauth_state');

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code);

    // Fetch user information from Google
    const userInfo: GoogleUserInfo = await getGoogleUserInfo(
      tokenResponse.access_token
    );

    // Verify email is provided (Requirement 2.3)
    if (!userInfo.email) {
      console.error('Email not provided by Google OAuth');
      return NextResponse.redirect(
        new URL('/login?error=email_required', request.url)
      );
    }

    // Create or retrieve user (Requirement 2.4)
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    let isNewUser = false;

    if (!user) {
      // First-time user - create user record
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0], // Fallback to email username if name not provided
          avatar: userInfo.picture,
        },
      });
      isNewUser = true;
    } else {
      // Update user info if changed (always update to ensure latest info)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userInfo.name || user.name || userInfo.email.split('@')[0], // Keep existing name if new name not provided
          avatar: userInfo.picture || user.avatar,
        },
      });
    }

    // Get user's active project (if any)
    const membership = await prisma.projectMembership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Create session (Requirement 2.5)
    await createSession(user.id, membership?.projectId ?? null);

    // Redirect based on user status
    if (isNewUser || !membership) {
      // New user or user with no projects - guide to create first project (Requirement 2.5)
      return NextResponse.redirect(new URL('/onboarding', request.url));
    } else {
      // Existing user with projects - redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=authentication_failed', request.url)
    );
  }
}
