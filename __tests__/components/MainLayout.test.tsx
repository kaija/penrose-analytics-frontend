/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MainLayout from '@/components/MainLayout';

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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('MainLayout', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders children content', () => {
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders top navigation', () => {
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    // Check for navigation tabs
    expect(screen.getByText('Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Profiles')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText('Automate')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
  });

  it('does not render Start Free Trial button', () => {
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    expect(screen.queryByText('Start Free Trial')).not.toBeInTheDocument();
  });

  it('renders left sidebar when provided', () => {
    render(
      <MainLayout leftSidebar={<div>Sidebar Content</div>}>
        <div>Main Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('does not render sidebar when not provided', () => {
    const { container } = render(
      <MainLayout>
        <div>Main Content</div>
      </MainLayout>
    );

    const sidebar = container.querySelector('aside');
    expect(sidebar).not.toBeInTheDocument();
  });
});
