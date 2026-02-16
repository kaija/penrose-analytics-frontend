/**
 * @jest-environment jsdom
 */

/**
 * Onboarding Page Tests
 * 
 * Tests the first-time user onboarding flow
 * Requirements: 2.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/app/onboarding/OnboardingForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Onboarding Flow', () => {
  const mockPush = jest.fn();
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  /**
   * Test: First-time user can create their first project
   * Requirement 2.5: When a first-time user is created, the system shall guide
   * the user to create their first Project
   */
  it('should create project and redirect to dashboard', async () => {
    // Setup: Mock successful project creation
    const mockProject = {
      id: 'project-123',
      name: 'My First Project',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProject }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { projectId: mockProject.id } }),
      } as Response);

    // Render the form
    render(<OnboardingForm />);

    // Fill in project name
    const input = screen.getByLabelText(/project name/i);
    fireEvent.change(input, { target: { value: 'My First Project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitButton);

    // Wait for API calls and redirect
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Verify: Project creation API called
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'My First Project' }),
    });

    // Verify: Project switch API called
    expect(mockFetch).toHaveBeenNthCalledWith(2, `/api/projects/${mockProject.id}/switch`, {
      method: 'POST',
    });

    // Verify: Redirected to dashboard
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  /**
   * Test: Show error message when project creation fails
   */
  it('should display error message on project creation failure', async () => {
    // Setup: Mock failed project creation
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'Project name is required' },
      }),
    } as Response);

    // Render the form
    render(<OnboardingForm />);

    // Fill in project name
    const input = screen.getByLabelText(/project name/i);
    fireEvent.change(input, { target: { value: 'Test Project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    // Verify: Not redirected
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Test: Show error message when project switch fails
   */
  it('should display error message on project switch failure', async () => {
    // Setup: Mock successful project creation but failed switch
    const mockProject = {
      id: 'project-123',
      name: 'My First Project',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProject }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Failed to switch to project' },
        }),
      } as Response);

    // Render the form
    render(<OnboardingForm />);

    // Fill in project name
    const input = screen.getByLabelText(/project name/i);
    fireEvent.change(input, { target: { value: 'My First Project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to switch to project')).toBeInTheDocument();
    });

    // Verify: Not redirected
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Test: Disable form during submission
   */
  it('should disable form during submission', async () => {
    // Setup: Mock slow API response
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  data: {
                    id: 'project-123',
                    name: 'My First Project',
                  },
                }),
              } as Response),
            100
          )
        )
    );

    // Render the form
    render(<OnboardingForm />);

    // Fill in project name
    const input = screen.getByLabelText(/project name/i);
    fireEvent.change(input, { target: { value: 'My First Project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(submitButton);

    // Verify: Button shows loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating project/i })).toBeDisabled();
    });

    // Verify: Input is disabled
    expect(input).toBeDisabled();
  });
});
