/**
 * Google OAuth Configuration and Utilities
 * Implements OAuth 2.0 flow for Google authentication
 * 
 * Requirements: 2.1, 2.2
 */

/**
 * Google OAuth configuration from environment variables
 */
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.APP_BASE_URL}/api/auth/callback/google`,
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scopes: ['openid', 'email', 'profile'],
};

/**
 * Google user information returned from OAuth
 */
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

/**
 * Generate the Google OAuth authorization URL
 * Redirects user to Google login page
 * 
 * @param state - Random state parameter for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_OAUTH_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * 
 * @param code - Authorization code from Google OAuth callback
 * @returns Access token response
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Fetch user information from Google using access token
 * 
 * @param accessToken - Access token from token exchange
 * @returns Google user information
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user info: ${error}`);
  }

  return response.json();
}

/**
 * Generate a random state parameter for CSRF protection
 * 
 * @returns Random state string
 */
export function generateState(): string {
  return crypto.randomUUID();
}
