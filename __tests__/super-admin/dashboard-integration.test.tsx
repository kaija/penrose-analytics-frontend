/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuperAdminDashboardClient from '../../app/__super_admin__/components/SuperAdminDashboardClient';
import { ProjectWithStats } from '../../app/__super_admin__/components/ProjectListSection';
import { UserWithMemberships } from '../../app/__super_admin__/components/UserListSection';

/**
 * Unit tests for SuperAdminDashboardClient integration
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

// Mock fetch
global.fetch = jest.fn();

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('SuperAdminDashboardClient Integration', () => {
  const mockProjects: ProjectWithStats[] = [
    {
      id: 'proj-1',
      name: 'Project Alpha',
      enabled: true,
      createdAt: new Date('2024-01-01'),
      memberCount: 5,
    },
    {
      id: 'proj-2',
      name: 'Project Beta',
      enabled: false,
      createdAt: new Date('2024-02-01'),
      memberCount: 3,
    },
  ];

  const mockUsers: UserWithMemberships[] = [
    {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice Smith',
      avatar: null,
      createdAt: new Date('2024-01-01'),
      memberships: [
        {
          projectId: 'proj-1',
          projectName: 'Project Alpha',
          role: 'owner',
          createdAt: new Date('2024-01-01'),
        },
      ],
    },
    {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob Johnson',
      avatar: null,
      createdAt: new Date('2024-02-01'),
      memberships: [],
    },
  ];

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    (window as any).location.href = '';
  });

  describe('initial data loading', () => {
    it('should render projects section with initial data', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      expect(screen.getByText('All Projects')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should render users section with initial data', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      expect(screen.getByText('All Users')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should render dashboard header', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('System-wide administration')).toBeInTheDocument();
    });
  });

  describe('project selection for event chart', () => {
    it('should open event chart when project is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projectId: 'proj-1',
          data: [{ month: '2024-01', count: 100 }],
          isSimulated: false,
        }),
      });

      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const projectRow = screen.getByText('Project Alpha').closest('tr');
      fireEvent.click(projectRow!);

      await waitFor(() => {
        expect(screen.getByText(/Event Usage - Project Alpha/)).toBeInTheDocument();
      });
    });

    it('should close event chart when close button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projectId: 'proj-1',
          data: [],
          isSimulated: false,
        }),
      });

      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const projectRow = screen.getByText('Project Alpha').closest('tr');
      fireEvent.click(projectRow!);

      await waitFor(() => {
        expect(screen.getByText(/Event Usage - Project Alpha/)).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Event Usage - Project Alpha/)).not.toBeInTheDocument();
      });
    });
  });

  describe('user selection for detail view', () => {
    it('should open user detail view when user is clicked', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const userRow = screen.getByText('alice@example.com').closest('tr');
      fireEvent.click(userRow!);

      expect(screen.getByText('User Details')).toBeInTheDocument();
      // Check for Alice Smith in the modal specifically
      const aliceNames = screen.getAllByText('Alice Smith');
      expect(aliceNames.length).toBeGreaterThan(0);
    });

    it('should close user detail view when close button is clicked', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const userRow = screen.getByText('alice@example.com').closest('tr');
      fireEvent.click(userRow!);

      expect(screen.getByText('User Details')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByText('User Details')).not.toBeInTheDocument();
    });
  });

  describe('access project functionality', () => {
    it('should call access-project API when Access button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          redirectUrl: '/projects/proj-1',
          projectId: 'proj-1',
        }),
      });

      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const accessButtons = screen.getAllByText('Access');
      fireEvent.click(accessButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/super-admin/access-project',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ projectId: 'proj-1' }),
          })
        );
      });
    });

    it('should show loading overlay while accessing project', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const accessButtons = screen.getAllByText('Access');
      fireEvent.click(accessButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accessing project...')).toBeInTheDocument();
      });
    });

    it('should show alert on access error', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={mockUsers}
        />
      );

      const accessButtons = screen.getAllByText('Access');
      fireEvent.click(accessButtons[0]);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Failed to access project. Please try again.');
      });

      alertMock.mockRestore();
    });
  });

  describe('empty state handling', () => {
    it('should handle empty projects list', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={[]}
          initialUsers={mockUsers}
        />
      );

      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });

    it('should handle empty users list', () => {
      render(
        <SuperAdminDashboardClient
          initialProjects={mockProjects}
          initialUsers={[]}
        />
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });
});
