/**
 * OAuth Configuration Tests
 * Tests for Google OAuth setup and utilities
 * 
 * Requirements: 2.1, 2.2
 */

// Set up environment variables for testing
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.APP_BASE_URL = 'http://localhost:3000';

import {
  GOOGLE_OAUTH_CONFIG,
  getGoogleAuthorizationUrl,
  generateState,
} from '@/lib/oauth';

describe('OAuth Configuration', () => {
  describe('GOOGLE_OAUTH_CONFIG', () => {
    it('should have all required configuration fields', () => {
      expect(GOOGLE_OAUTH_CONFIG.clientId).toBeDefined();
      expect(GOOGLE_OAUTH_CONFIG.clientSecret).toBeDefined();
      expect(GOOGLE_OAUTH_CONFIG.redirectUri).toBeDefined();
      expect(GOOGLE_OAUTH_CONFIG.authorizationEndpoint).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth'
      );
      expect(GOOGLE_OAUTH_CONFIG.tokenEndpoint).toBe(
        'https://oauth2.googleapis.com/token'
      );
      expect(GOOGLE_OAUTH_CONFIG.userInfoEndpoint).toBe(
        'https://www.googleapis.com/oauth2/v2/userinfo'
      );
    });

    it('should request email and profile scopes', () => {
      expect(GOOGLE_OAUTH_CONFIG.scopes).toContain('openid');
      expect(GOOGLE_OAUTH_CONFIG.scopes).toContain('email');
      expect(GOOGLE_OAUTH_CONFIG.scopes).toContain('profile');
    });

    it('should construct redirect URI from APP_BASE_URL', () => {
      expect(GOOGLE_OAUTH_CONFIG.redirectUri).toContain(
        '/api/auth/callback/google'
      );
    });
  });

  describe('getGoogleAuthorizationUrl', () => {
    it('should generate valid authorization URL with state', () => {
      const state = 'test-state-123';
      const url = getGoogleAuthorizationUrl(state);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain(`client_id=${GOOGLE_OAUTH_CONFIG.clientId}`);
      expect(url).toContain(
        `redirect_uri=${encodeURIComponent(GOOGLE_OAUTH_CONFIG.redirectUri)}`
      );
    });

    it('should include access_type=offline for refresh tokens', () => {
      const state = 'test-state';
      const url = getGoogleAuthorizationUrl(state);

      expect(url).toContain('access_type=offline');
    });

    it('should include prompt=consent', () => {
      const state = 'test-state';
      const url = getGoogleAuthorizationUrl(state);

      expect(url).toContain('prompt=consent');
    });
  });

  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state1 = generateState();
      const state2 = generateState();

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state1).not.toBe(state2);
    });

    it('should generate UUID format state', () => {
      const state = generateState();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(state).toMatch(uuidRegex);
    });
  });
});
