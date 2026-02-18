'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

export interface TimeframeValue {
  type: 'relative' | 'absolute';
  /** For relative: e.g. "0d" (today), "1d" (yesterday), "7d", "30d", "90d", "365d", or custom "Nd" */
  relativeValue?: string;
  /** For absolute: ISO date strings */
  from?: string;
  to?: string;
  /** Display label */
  label: string;
}

const RELATIVE_PRESETS = [
  { label: 'Today', value: '0d' },
  { label: 'Yesterday', value: '1d' },
  { label: '2 days ago', value: '2d' },
  { label: '7 days ago', value: '7d' },
  { label: '30 days ago', value: '30d' },
  { label: '90 days ago', value: '90d' },
  { label: '1 year ago', value: '365d' },
  { label: '2 years ago', value: '730d' },
];

const UNIT_OPTIONS = [
  { label: 'days ago', value: 'days' },
  { label: 'weeks ago', value: 'weeks' },
  { label: 'months ago', value: 'months' },
];

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert a TimeframeValue to { from, to } ISO strings for API calls */
export function resolveTimeframe(tf: TimeframeValue): { from: string; to: string } {
  if (tf.type === 'absolute' && tf.from && tf.to) {
    return { from: new Date(tf.from).toISOString(), to: new Date(tf.to + 'T23:59:59').toISOString() };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const match = tf.relativeValue?.match(/^(\d+)d$/);
  const days = match ? parseInt(match[1], 10) : 30;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: now.toISOString() };
}

interface Props {
  value: TimeframeValue;
  onChange: (v: TimeframeValue) => void;
}

export default function TimeframeSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'relative' | 'absolute'>(value.type);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared start/end date picker state (used by both tabs)
  const [pickerFrom, setPickerFrom] = useState(() => {
    if (value.from) return value.from;
    const d = new Date(); d.setDate(d.getDate() - 30);
    return formatDateLocal(d);
  });
  const [pickerTo, setPickerTo] = useState(() => value.to ?? formatDateLocal(new Date()));

  // Relative custom local state
  const [customNum, setCustomNum] = useState('30');
  const [customUnit, setCustomUnit] = useState('days');

  // Active preset highlight (null if user manually changed dates)
  const [activePreset, setActivePreset] = useState<string | null>(
    value.type === 'relative' ? (value.relativeValue ?? null) : null
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /** Fill date pickers from a preset (does NOT apply yet) */
  function selectPreset(preset: typeof RELATIVE_PRESETS[number]) {
    const match = preset.value.match(/^(\d+)d$/);
    const days = match ? parseInt(match[1], 10) : 0;
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    setPickerFrom(formatDateLocal(from));
    setPickerTo(formatDateLocal(today));
    setActivePreset(preset.value);
  }

  function fillCustomRelative() {
    let days = parseInt(customNum, 10) || 0;
    if (customUnit === 'weeks') days *= 7;
    if (customUnit === 'months') days *= 30;
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    setPickerFrom(formatDateLocal(from));
    setPickerTo(formatDateLocal(today));
    setActivePreset(null);
  }

  function handlePickerFromChange(v: string) {
    setPickerFrom(v);
    setActivePreset(null); // user manually changed, clear preset highlight
  }

  function handlePickerToChange(v: string) {
    setPickerTo(v);
    setActivePreset(null);
  }

  function applySelection() {
    if (tab === 'relative' && activePreset) {
      const preset = RELATIVE_PRESETS.find(p => p.value === activePreset);
      const label = preset ? `${preset.label} → Today` : `${pickerFrom} → ${pickerTo}`;
      onChange({ type: 'relative', relativeValue: activePreset, from: pickerFrom, to: pickerTo, label });
    } else {
      const label = `${pickerFrom} → ${pickerTo}`;
      onChange({ type: 'absolute', from: pickerFrom, to: pickerTo, label });
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">{value.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(['relative', 'absolute'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t === 'relative' ? 'Relative' : 'Absolute'}
              </button>
            ))}
          </div>

          <div className="flex">
            {/* Left: presets (relative tab) or empty (absolute tab) */}
            {tab === 'relative' && (
              <div className="w-44 border-r border-gray-200 dark:border-gray-700 p-2 space-y-0.5 max-h-72 overflow-y-auto shrink-0">
                {RELATIVE_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => selectPreset(p)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                      activePreset === p.value
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-left">{p.label}</span>
                  </button>
                ))}
                {/* Custom relative shortcut */}
                <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-2">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-1">Custom</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={customNum}
                      onChange={e => setCustomNum(e.target.value)}
                      className="w-14 px-1.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <select
                      value={customUnit}
                      onChange={e => setCustomUnit(e.target.value)}
                      className="flex-1 px-1 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      {UNIT_OPTIONS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fillCustomRelative}
                    className="w-full mt-1.5 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Fill dates →
                  </button>
                </div>
              </div>
            )}

            {/* Right: date pickers (always shown) */}
            <div className="flex-1 p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={pickerFrom}
                  onChange={e => handlePickerFromChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={pickerTo}
                  onChange={e => handlePickerToChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {/* Preview */}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                {pickerFrom} → {pickerTo}
              </div>
              <button
                onClick={applySelection}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
