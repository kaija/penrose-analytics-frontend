/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectSwitcher from '@/components/ProjectSwitcher';

describe('ProjectSwitcher', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('Requirement 3.6: Display project switcher in top-right area', () => {
    it('renders the project switcher button', () => {
      render(<ProjectSwitcher />);
      
      // Should show user name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      // Should have chevron icon
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('displays user avatar with first letter of name', () => {
      render(<ProjectSwitcher />);
      
      const avatar = screen.getByText('J');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('bg-red-600');
    });
  });

  describe('Requirement 3.7: Display panel with organization section and projects list', () => {
    it('opens dropdown panel when clicked', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Panel should be visible
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
    });

    it('displays user information in panel', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show full user info
      expect(screen.getAllByText('John Doe')[1]).toBeInTheDocument(); // Second instance in panel
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays projects list section', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show projects section
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Project Gamma')).toBeInTheDocument();
    });

    it('displays organization section placeholder', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show organization section
      expect(screen.getByText('ORGANIZATION')).toBeInTheDocument();
      expect(screen.getByText('No organization')).toBeInTheDocument();
    });

    it('closes panel when clicking outside', async () => {
      render(
        <div>
          <ProjectSwitcher />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Panel should be open
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      
      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.8: Highlight current active project', () => {
    it('highlights the active project in the list', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const activeProject = screen.getByText('Project Alpha').closest('button');
      expect(activeProject).toHaveClass('bg-red-50');
      expect(activeProject).toHaveClass('text-red-600');
      
      const inactiveProject = screen.getByText('Project Beta').closest('button');
      expect(inactiveProject).not.toHaveClass('bg-red-50');
      expect(inactiveProject).toHaveClass('text-gray-700');
    });
  });

  describe('Requirement 3.9: Search box with placeholder', () => {
    it('displays search box with correct placeholder', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search organizations and projects');
      expect(searchInput).toBeInTheDocument();
    });

    it('filters projects based on search query', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search organizations and projects');
      
      // Initially all projects visible
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Project Gamma')).toBeInTheDocument();
      
      // Search for "Beta"
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      
      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument();
    });

    it('search is case-insensitive', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search organizations and projects');
      
      // Search with lowercase
      fireEvent.change(searchInput, { target: { value: 'alpha' } });
      
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.10: Add Project button', () => {
    it('displays Add Project button', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const addButton = screen.getByText('Add Project');
      expect(addButton).toBeInTheDocument();
    });

    it('Add Project button has Plus icon', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const addButton = screen.getByText('Add Project').closest('button');
      expect(addButton).toBeInTheDocument();
      
      // Check for svg icon
      const svg = addButton?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('closes panel when Add Project is clicked', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const addButton = screen.getByText('Add Project');
      fireEvent.click(addButton);
      
      // Panel should close
      expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.11: Sign Out button', () => {
    it('displays Sign Out button', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton).toBeInTheDocument();
    });

    it('Sign Out button has LogOut icon', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const signOutButton = screen.getByText('Sign Out').closest('button');
      expect(signOutButton).toBeInTheDocument();
      
      // Check for svg icon
      const svg = signOutButton?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Requirement 3.12: Update session when project selected', () => {
    it('closes panel when a project is selected', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const projectButton = screen.getByText('Project Beta');
      fireEvent.click(projectButton);
      
      // Panel should close
      expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
    });

    it('allows clicking on different projects', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const projectButton = screen.getByText('Project Beta');
      fireEvent.click(projectButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Switch to project:', '2');
      
      consoleSpy.mockRestore();
    });
  });

  describe('UI Behavior', () => {
    it('toggles panel open and closed', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      
      // Open
      fireEvent.click(button);
      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      
      // Close
      fireEvent.click(button);
      expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
    });

    it('maintains search query when panel is reopened', () => {
      render(<ProjectSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search organizations and projects') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      
      // Close panel
      fireEvent.click(button);
      
      // Reopen panel
      fireEvent.click(button);
      
      const searchInputAgain = screen.getByPlaceholderText('Search organizations and projects') as HTMLInputElement;
      expect(searchInputAgain.value).toBe('Beta');
    });
  });
});
