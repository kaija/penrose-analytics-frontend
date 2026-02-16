/**
 * Login Page Tests
 * Tests for the login page component
 * 
 * Requirements: 2.1
 */

import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { validateSession } from '@/lib/session';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/session');
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display "Sign in with Google" button', async () => {
    (validateSession as jest.Mock).mockResolvedValue(null);

    const page = await LoginPage();
    const { container } = render(page);

    // Verify page title
    expect(container.textContent).toContain('Prism CDP');
    expect(container.textContent).toContain('Customer Data Platform & Analytics');

    // Verify Google sign-in button
    expect(container.textContent).toContain('Sign in with Google');
  });

  it('should have link to OAuth login endpoint', async () => {
    (validateSession as jest.Mock).mockResolvedValue(null);

    const page = await LoginPage();
    const { container } = render(page);

    // Find the link element
    const link = container.querySelector('a[href="/api/auth/login"]');
    expect(link).toBeTruthy();
  });

  it('should redirect authenticated users to home', async () => {
    (validateSession as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      activeProjectId: 'project-456',
    });

    await LoginPage();

    // Verify redirect was called
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('should display terms and privacy notice', async () => {
    (validateSession as jest.Mock).mockResolvedValue(null);

    const page = await LoginPage();
    const { container } = render(page);

    // Verify legal notice
    expect(container.textContent).toContain('Terms of Service');
    expect(container.textContent).toContain('Privacy Policy');
  });

  it('should display Google logo in button', async () => {
    (validateSession as jest.Mock).mockResolvedValue(null);

    const page = await LoginPage();
    const { container } = render(page);

    // Verify SVG Google logo exists
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
