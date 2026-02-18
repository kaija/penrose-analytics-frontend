'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { Layers, Plus, Pencil, Trash2, Filter, Clock } from 'lucide-react';
import type { SegmentFilter, SegmentFilterConfig } from '@/lib/types/segment-filter';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filterConfig: SegmentFilterConfig;
  createdAt: string;
  updatedAt: string;
}

interface SegmentsClientProps {
  projectId: string;
}

/** Build a short human-readable summary of the filters inside a Segment. */
function buildFilterSummary(filterConfig: SegmentFilterConfig): string {
  const filters: SegmentFilter[] = filterConfig?.filters ?? [];
  if (filters.length === 0) return 'No filters';

  const parts = filters.map((f) => {
    if (f.filterType === 'event') {
      return f.event?.displayName ?? f.event?.eventName ?? 'Event';
    }
    return f.property?.displayName ?? f.property?.field ?? 'Property';
  });

  if (parts.length <= 3) return parts.join(' AND ');
  return `${parts.slice(0, 3).join(' AND ')} +${parts.length - 3} more`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SegmentsClient({ projectId }: SegmentsClientProps) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/segments`);
      if (!res.ok) throw new Error('Failed to load segments');
      const json = await res.json();
      setSegments(json.data?.segments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleDelete = async (segment: Segment) => {
    if (!window.confirm(`Are you sure you want to delete "${segment.name}"?`)) return;

    setDeletingId(segment.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/segments/${segment.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete segment');
      setSegments((prev) => prev.filter((s) => s.id !== segment.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete segment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Segments
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/configure/segments/new')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增 Segment
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">
            Loading segments…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 py-12 text-center">
            {error}
          </div>
        )}

        {!loading && !error && segments.length === 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Segments Yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Create your first segment to define user groups based on events and properties.
            </p>
            <button
              type="button"
              onClick={() => router.push('/configure/segments/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增 Segment
            </button>
          </div>
        )}

        {!loading && !error && segments.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Filters
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {segments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {seg.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {seg.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        <Filter className="w-3 h-3" />
                        {buildFilterSummary(seg.filterConfig)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(seg.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(seg.updatedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/configure/segments/${seg.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded transition-colors"
                          title="Edit segment"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(seg)}
                          disabled={deletingId === seg.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          title="Delete segment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
