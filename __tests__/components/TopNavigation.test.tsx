/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import TopNavigation from '@/components/TopNavigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboards',
}));

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

  it('renders Start Free Trial button', () => {
    render(<TopNavigation />);

    const button = screen.getByText('Start Free Trial');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-red-600');
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
    expect(buttons.length).toBeGreaterThan(2); // At least Start Free Trial, notification, theme toggle
  });

  it('renders project switcher', () => {
    render(<TopNavigation />);

    // Project switcher should show user name
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
