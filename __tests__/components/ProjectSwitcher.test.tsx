/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectSwitcher from '@/components/ProjectSwitcher';

// Mock fetch
global.fetch = jest.fn();

describe('ProjectSwitcher', () => {
  const mockUserData = {
    user: {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      avatar: null,
    },
    projects: [
      { id: '1', name: 'Project Alpha' },
      { id: '2', name: 'Project Beta' },
      { id: '3', name: 'Project Gamma' },
    ],
    activeProjectId: '1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUserData,
    });
  });

  describe('Requirement 3.6: Display project switcher in top-right area', () => {
    it('renders the project switcher button', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('displays user avatar with first letter of name', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        const avatar = screen.getByText('J');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveClass('bg-red-600');
      });
    });

    it('displays current project name', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.7: Display panel with projects list', () => {
    it('opens dropdown panel when clicked', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
    });

    it('displays user information in panel', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(1);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays projects list section', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      expect(screen.getAllByText('Project Alpha').length).toBeGreaterThan(0);
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Project Gamma')).toBeInTheDocument();
    });

    it('does not display organization section', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.queryByText('ORGANIZATION')).not.toBeInTheDocument();
      expect(screen.queryByText('No organization')).not.toBeInTheDocument();
    });

    it('closes panel when clicking outside', async () => {
      render(
        <div>
          <ProjectSwitcher />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.8: Highlight current active project', () => {
    it('highlights the active project in the list', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const projectButtons = screen.getAllByRole('button');
      const activeProject = projectButtons.find(btn => btn.textContent === 'Project Alpha');
      const inactiveProject = projectButtons.find(btn => btn.textContent === 'Project Beta');
      
      expect(activeProject).toHaveClass('bg-red-50');
      expect(activeProject).toHaveClass('text-red-600');
      expect(inactiveProject).not.toHaveClass('bg-red-50');
    });
  });

  describe('Requirement 3.9: Search box with placeholder', () => {
    it('displays search box with correct placeholder', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search projects');
      expect(searchInput).toBeInTheDocument();
    });

    it('filters projects based on search query', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search projects');
      
      expect(screen.getAllByText('Project Alpha').length).toBeGreaterThan(0);
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Project Gamma')).toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      });
    });

    it('search is case-insensitive', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search projects');
      fireEvent.change(searchInput, { target: { value: 'alpha' } });
      
      await waitFor(() => {
        expect(screen.getAllByText(/Project Alpha/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirement 3.10: Add Project button', () => {
    it('displays Add Project button', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const addButton = screen.getByText('Add Project');
      expect(addButton).toBeInTheDocument();
    });

    it('Add Project button has Plus icon', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const addButton = screen.getByText('Add Project').closest('button');
      expect(addButton).toBeInTheDocument();
      
      const svg = addButton?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Requirement 3.11: Sign Out button', () => {
    it('displays Sign Out button', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton).toBeInTheDocument();
    });

    it('Sign Out button has LogOut icon', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const signOutButton = screen.getByText('Sign Out').closest('button');
      expect(signOutButton).toBeInTheDocument();
      
      const svg = signOutButton?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Requirement 3.12: Update session when project selected', () => {
    it('calls API when a project is selected', async () => {
      delete (window as any).location;
      const mockReload = jest.fn();
      (window as any).location = { reload: mockReload };

      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const projectButton = screen.getByText('Project Beta');
      fireEvent.click(projectButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/2/switch',
          { method: 'POST' }
        );
      });
    });
  });

  describe('UI Behavior', () => {
    it('toggles panel open and closed', async () => {
      render(<ProjectSwitcher />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button');
      
      fireEvent.click(button);
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });
  });
});
