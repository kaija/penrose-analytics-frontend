'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../../ConfigureSidebar';
import SegmentFilterPanel from '@/components/SegmentFilterPanel';
import { resolveTimeframe } from '@/components/TimeframeSelector';
import type { TimeframeValue } from '@/components/TimeframeSelector';
import type { SegmentFilter } from '@/lib/types/segment-filter';
import { ArrowLeft, Save, Layers } from 'lucide-react';

interface SegmentCreateClientProps {
  projectId: string;
}

const DEFAULT_TIMEFRAME: TimeframeValue = {
  type: 'relative',
  relativeValue: '30d',
  label: '30 days ago',
};

export default function SegmentCreateClient({ projectId }: SegmentCreateClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<SegmentFilter[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeValue>(DEFAULT_TIMEFRAME);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSave = async () => {
    // Client-side validation
    setNameError(null);

    if (!name.trim()) {
      setNameError('名稱為必填');
      return;
    }

    setSaving(true);
    try {
      const timeRange = resolveTimeframe(timeframe);
      const res = await fetch(`/api/projects/${projectId}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          filterConfig: { filters, timeRange },
        }),
      });

      if (res.status === 409) {
        setNameError('此名稱已存在');
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? 'Failed to create segment');
      }

      router.push('/configure/segments');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create segment');
    } finally {
      setSaving(false);
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
              新增 Segment
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/configure/segments')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="segment-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              名稱 <span className="text-red-500">*</span>
            </label>
            <input
              id="segment-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Enter segment name"
              maxLength={200}
              className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                nameError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="segment-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              描述
            </label>
            <textarea
              id="segment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter segment description (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Filters */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              篩選條件
            </h2>
            <SegmentFilterPanel
              projectId={projectId}
              value={filters}
              onChange={setFilters}
              showTimeframe
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
