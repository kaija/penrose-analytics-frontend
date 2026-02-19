/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventUsageChart from '../../app/__super_admin__/components/EventUsageChart';

/**
 * Unit tests for EventUsageChart component
 *
 * **Validates: Requirements 3.5, 6.2, 6.3**
 */

// Mock fetch
global.fetch = jest.fn();

// Mock Recharts components to avoid rendering issues in tests
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

describe('EventUsageChart', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('with real data', () => {
    const mockRealData = {
      projectId: 'proj-123',
      data: [
        { month: '2024-01', count: 1000 },
        { month: '2024-02', count: 1200 },
        { month: '2024-03', count: 1100 },
      ],
      isSimulated: false,
    };

    it('should display project name in header', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRealData,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Event Usage - Test Project/)).toBeInTheDocument();
      });
    });

    it('should fetch event data on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRealData,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/super-admin/events/proj-123');
      });
    });

    it('should render chart with real data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRealData,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should not show simulated data warning for real data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRealData,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Showing simulated data/)).not.toBeInTheDocument();
      });
    });
  });

  describe('with simulated data', () => {
    const mockSimulatedData = {
      projectId: 'proj-456',
      data: [
        { month: '2024-01', count: 800 },
        { month: '2024-02', count: 900 },
        { month: '2024-03', count: 850 },
      ],
      isSimulated: true,
    };

    it('should show simulated data warning', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSimulatedData,
      });

      render(<EventUsageChart projectId="proj-456" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Showing simulated data/)).toBeInTheDocument();
      });
    });

    it('should still render chart with simulated data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSimulatedData,
      });

      render(<EventUsageChart projectId="proj-456" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('with no data', () => {
    const mockNoData = {
      projectId: 'proj-789',
      data: [],
      isSimulated: false,
    };

    it('should display no data message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNoData,
      });

      render(<EventUsageChart projectId="proj-789" projectName="Empty Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('No event data available')).toBeInTheDocument();
      });
    });

    it('should not render chart when no data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNoData,
      });

      render(<EventUsageChart projectId="proj-789" projectName="Empty Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should display loading message while fetching', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      expect(screen.getByText('Loading event data...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch event data')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button in header is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'proj-123', data: [], isSimulated: false }),
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        closeButton.click();
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when close button in footer is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'proj-123', data: [], isSimulated: false }),
      });

      render(<EventUsageChart projectId="proj-123" projectName="Test Project" onClose={mockOnClose} />);

      await waitFor(() => {
        const closeButtons = screen.getAllByText('Close');
        const footerCloseButton = closeButtons[closeButtons.length - 1];
        footerCloseButton.click();
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
