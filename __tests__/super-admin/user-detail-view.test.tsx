/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserDetailView from '../../app/__super_admin__/components/UserDetailView';
import { UserWithMemberships } from '../../app/__super_admin__/components/UserListSection';

/**
 * Unit tests for UserDetailView component
 *
 * **Validates: Requirements 5.5, 5.6**
 */

describe('UserDetailView', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('user with memberships', () => {
    const userWithMemberships: UserWithMemberships = {
      id: 'user-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date('2024-01-15'),
      memberships: [
        {
          projectId: 'proj-1',
          projectName: 'Project Alpha',
          role: 'owner',
          createdAt: new Date('2024-01-20'),
        },
        {
          projectId: 'proj-2',
          projectName: 'Project Beta',
          role: 'admin',
          createdAt: new Date('2024-02-01'),
        },
        {
          projectId: 'proj-3',
          projectName: 'Project Gamma',
          role: 'editor',
          createdAt: new Date('2024-02-15'),
        },
      ],
    };

    it('should display user information correctly', () => {
      render(<UserDetailView user={userWithMemberships} onClose={mockOnClose} />);

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText(/ID: user-123/)).toBeInTheDocument();
      expect(screen.getByText(/Created: 1\/15\/2024/)).toBeInTheDocument();
    });

    it('should display user avatar when available', () => {
      render(<UserDetailView user={userWithMemberships} onClose={mockOnClose} />);

      const avatar = screen.getByAltText('Alice Smith');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should display all project memberships', () => {
      render(<UserDetailView user={userWithMemberships} onClose={mockOnClose} />);

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Project Gamma')).toBeInTheDocument();
    });

    it('should display membership roles correctly', () => {
      render(<UserDetailView user={userWithMemberships} onClose={mockOnClose} />);

      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('editor')).toBeInTheDocument();
    });

    it('should display membership creation dates', () => {
      render(<UserDetailView user={userWithMemberships} onClose={mockOnClose} />);

      expect(screen.getByText(/1\/20\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/2\/1\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/2\/15\/2024/)).toBeInTheDocument();
    });
  });

  describe('user without memberships', () => {
    const userWithoutMemberships: UserWithMemberships = {
      id: 'user-456',
      email: 'bob@example.com',
      name: 'Bob Johnson',
      avatar: null,
      createdAt: new Date('2024-03-01'),
      memberships: [],
    };

    it('should display message when user has no memberships', () => {
      render(<UserDetailView user={userWithoutMemberships} onClose={mockOnClose} />);

      expect(screen.getByText('This user is not a member of any projects')).toBeInTheDocument();
    });

    it('should display fallback avatar when avatar is null', () => {
      render(<UserDetailView user={userWithoutMemberships} onClose={mockOnClose} />);

      // Should display first letter of name
      const fallbackAvatar = screen.getByText('B');
      expect(fallbackAvatar).toBeInTheDocument();
    });

    it('should still display user information', () => {
      render(<UserDetailView user={userWithoutMemberships} onClose={mockOnClose} />);

      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    const mockUser: UserWithMemberships = {
      id: 'user-789',
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      avatar: null,
      createdAt: new Date('2024-04-01'),
      memberships: [],
    };

    it('should call onClose when close button in header is clicked', () => {
      render(<UserDetailView user={mockUser} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button in footer is clicked', () => {
      render(<UserDetailView user={mockUser} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByText('Close');
      const footerCloseButton = closeButtons[closeButtons.length - 1];
      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('role styling', () => {
    it('should apply different styles for different roles', () => {
      const userWithAllRoles: UserWithMemberships = {
        id: 'user-999',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        createdAt: new Date('2024-01-01'),
        memberships: [
          {
            projectId: 'proj-1',
            projectName: 'Project 1',
            role: 'owner',
            createdAt: new Date('2024-01-01'),
          },
          {
            projectId: 'proj-2',
            projectName: 'Project 2',
            role: 'admin',
            createdAt: new Date('2024-01-01'),
          },
          {
            projectId: 'proj-3',
            projectName: 'Project 3',
            role: 'editor',
            createdAt: new Date('2024-01-01'),
          },
          {
            projectId: 'proj-4',
            projectName: 'Project 4',
            role: 'viewer',
            createdAt: new Date('2024-01-01'),
          },
        ],
      };

      render(<UserDetailView user={userWithAllRoles} onClose={mockOnClose} />);

      const ownerBadge = screen.getByText('owner');
      const adminBadge = screen.getByText('admin');
      const editorBadge = screen.getByText('editor');
      const viewerBadge = screen.getByText('viewer');

      expect(ownerBadge).toHaveClass('bg-purple-100');
      expect(adminBadge).toHaveClass('bg-blue-100');
      expect(editorBadge).toHaveClass('bg-green-100');
      expect(viewerBadge).toHaveClass('bg-gray-100');
    });
  });
});
