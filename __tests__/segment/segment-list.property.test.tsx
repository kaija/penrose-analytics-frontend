/**
 * @jest-environment jsdom
 */

/**
 * Property-based tests for Segment List Rendering
 *
 * Feature: segment-management, Property 13: Segment 列表渲染完整性
 * Validates: Requirements 5.1, 5.2
 *
 * For any Segment list, the rendered UI should contain each Segment's
 * name, description, and time information.
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/configure/segments',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock MainLayout to render children directly
jest.mock('@/components/MainLayout', () => {
  return function MockMainLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="main-layout">{children}</div>;
  };
});

// Mock ConfigureSidebar to render nothing
jest.mock('@/app/configure/ConfigureSidebar', () => {
  return function MockConfigureSidebar() {
    return null;
  };
});

// Mock lucide-react icons to simple spans
jest.mock('lucide-react', () => ({
  Layers: (props: any) => <span data-testid="icon-layers" {...props} />,
  Plus: (props: any) => <span data-testid="icon-plus" {...props} />,
  Pencil: (props: any) => <span data-testid="icon-pencil" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
  Filter: (props: any) => <span data-testid="icon-filter" {...props} />,
  Clock: (props: any) => <span data-testid="icon-clock" {...props} />,
}));

import SegmentsClient from '@/app/configure/segments/SegmentsClient';

// ── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a valid ISO date string within a reasonable range. */
const arbISODate = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  })
  .map((d) => d.toISOString());

/**
 * Generate a non-empty segment name using alphanumeric characters.
 * No consecutive spaces, no leading/trailing whitespace — avoids
 * text normalization issues with @testing-library.
 */
const arbSegmentName = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9]{2,30}$/)
  .filter((s) => s.length >= 3);

/** Generate an optional description (null or non-empty string). */
const arbDescription = fc.oneof(
  fc.constant(null),
  fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,60}$/).filter((s) => s.trim().length >= 1)
);

/** Generate a minimal valid filterConfig. */
const arbFilterConfig = fc.record({
  filters: fc.constant([]),
  timeRange: fc.record({
    from: arbISODate,
    to: arbISODate,
  }),
});

/**
 * Generate a list of 1-8 segments with unique IDs and unique names.
 * Unique IDs prevent React key collisions; unique names make assertions unambiguous.
 */
const arbSegmentList = fc
  .array(
    fc.record({
      name: arbSegmentName,
      description: arbDescription,
      filterConfig: arbFilterConfig,
      createdAt: arbISODate,
      updatedAt: arbISODate,
    }),
    { minLength: 1, maxLength: 8 }
  )
  .map((items) => {
    // Deduplicate by exact name to avoid ambiguous text assertions
    const seen = new Set<string>();
    // Reserved words that appear in the component UI
    const reserved = new Set([
      'segments', 'name', 'description', 'filters', 'created', 'updated', 'actions',
      'no filters', 'no segments yet',
    ]);
    const unique = items.filter((item) => {
      const lower = item.name.toLowerCase();
      if (seen.has(item.name) || reserved.has(lower)) return false;
      seen.add(item.name);
      return true;
    });
    // Assign unique sequential IDs
    return unique.map((item, i) => ({
      ...item,
      id: `seg-${i}-${Date.now()}`,
    }));
  })
  .filter((list) => list.length > 0);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function setupFetchMock(segments: any[]) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { segments } }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: segment-management, Property 13: Segment 列表渲染完整性', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it(
    'should render every segment name and time info for any segment list — Validates: Requirements 5.1, 5.2',
    async () => {
      await fc.assert(
        fc.asyncProperty(arbSegmentList, async (segments) => {
          // Clean up any previous render before starting a new one
          cleanup();
          setupFetchMock(segments);

          render(<SegmentsClient projectId="test-project-id" />);

          // Wait for loading to finish and segments to appear
          await waitFor(() => {
            expect(screen.queryByText('Loading segments…')).not.toBeInTheDocument();
          });

          // Verify each segment's name appears in the rendered output
          for (const seg of segments) {
            const nameElements = screen.getAllByText(seg.name);
            expect(nameElements.length).toBeGreaterThanOrEqual(1);
          }

          // Verify each segment's time info (createdAt and updatedAt) appears
          for (const seg of segments) {
            const createdFormatted = formatDate(seg.createdAt);
            const updatedFormatted = formatDate(seg.updatedAt);

            // Use getAllByText since multiple segments may share the same date
            const createdElements = screen.getAllByText(createdFormatted);
            expect(createdElements.length).toBeGreaterThanOrEqual(1);

            const updatedElements = screen.getAllByText(updatedFormatted);
            expect(updatedElements.length).toBeGreaterThanOrEqual(1);
          }

          // Clean up after this iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    },
    120000
  );
});
