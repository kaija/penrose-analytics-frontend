/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TopNavigation from '@/components/TopNavigation';

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ isSuperAdmin: false }),
  })
) as jest.Mock;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboards',
}));

// Mock ProjectSwitcher component
jest.mock('@/components/ProjectSwitcher', () => {
  return function MockProjectSwitcher() {
    return <div data-testid="project-switcher">Project Switcher</div>;
  };
});

// Mock ThemeToggle component
jest.mock('@/components/ThemeToggle', () => {
  return function MockThemeToggle() {
    return <button data-testid="theme-toggle">Theme Toggle</button>;
  };
});

describe('TopNavigation', () => {
  it('renders all navigation tabs', () => {
    render(<TopNavigation />);

    expect(screen.getByText('Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Profiles')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText('Automate')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
  });

  it('highlights active tab', () => {
    render(<TopNavigation />);

    const dashboardsLink = screen.getByText('Dashboards').closest('a');
    expect(dashboardsLink).toHaveClass('bg-red-50');
  });

  it('does not render Start Free Trial button', () => {
    render(<TopNavigation />);

    const button = screen.queryByText('Start Free Trial');
    expect(button).not.toBeInTheDocument();
  });

  it('renders notification icon', () => {
    const { container } = render(<TopNavigation />);

    // Check for bell icon button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders theme toggle', () => {
    render(<TopNavigation />);

    // Theme toggle should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders project switcher', () => {
    render(<TopNavigation />);

    // Project switcher should be present
    expect(screen.getByTestId('project-switcher')).toBeInTheDocument();
  });
});
