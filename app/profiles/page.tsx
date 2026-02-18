'use client';

import MainLayout from '@/components/MainLayout';
import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Search, Download, Filter, X, User, ArrowUpDown, Plus, Minus,
} from 'lucide-react';
import type {
  ProfileReportResponse, ProfileTableColumn, ProfileTableRow,
} from '@/lib/types/profile-report';
import TimeframeSelector, { resolveTimeframe, type TimeframeValue } from '@/components/TimeframeSelector';

// --- Constants ---

const PLAN_OPTIONS = ['All', 'Free', 'Pro', 'Enterprise'];
const COUNTRY_OPTIONS = ['All', 'TW', 'US', 'JP', 'KR', 'CN', 'SG', 'DE', 'AU'];
const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Name', type: 'property' as const },
  { id: 'email', label: 'Email', type: 'property' as const },
  { id: 'company', label: 'Company', type: 'property' as const },
  { id: 'plan', label: 'Plan', type: 'property' as const },
  { id: 'country', label: 'Country', type: 'property' as const },
  { id: 'm1', label: 'Total Logins', type: 'people_metric' as const },
  { id: 'm2', label: 'Total Pageviews', type: 'people_metric' as const },
  { id: 'm3', label: 'Last Page Viewed', type: 'people_metric' as const },
  { id: 'm4', label: 'Avg Session (min)', type: 'people_metric' as const },
];

const DEMO_PROJECT_ID = 'demo-project';

export default function ProfilesPage() {
  // --- Filter state ---
  const [configOpen, setConfigOpen] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeValue>({
    type: 'relative', relativeValue: '30d', label: '30 days ago → Today',
  });
  const [planFilter, setPlanFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map(c => c.id)
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  // --- Table state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('m1');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // --- Data state ---
  const [data, setData] = useState<ProfileReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Export state ---
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rules: { field: string; operator: string; values: string[] }[] = [];
    if (planFilter !== 'All') rules.push({ field: 'plan', operator: 'is', values: [planFilter.toLowerCase()] });
    if (countryFilter !== 'All') rules.push({ field: 'country', operator: 'is', values: [countryFilter] });
    const conditions = rules.length > 0 ? { operator: 'and' as const, rules } : undefined;

    try {
      const { from, to } = resolveTimeframe(timeframe);
      const res = await fetch(`/api/projects/${DEMO_PROJECT_ID}/reports/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeRange: { from, to },
          performedBy: { conditions },
          columns: selectedColumns.map(id => {
            const col = AVAILABLE_COLUMNS.find(c => c.id === id);
            return col?.type === 'people_metric'
              ? { type: 'people_metric', id, label: col.label, event: 'demo', operation: 'count' as const }
              : { type: 'property' as const, field: id, label: col?.label ?? id };
          }),
          sort: { columnId: sortColumn, direction: sortDirection },
          pagination: { page: currentPage, pageSize },
          search: searchQuery || undefined,
        }),
      });
      const json = await res.json();
      setData(json);
    } catch {
      // silently handle for demo
    } finally {
      setLoading(false);
    }
  }, [sortColumn, sortDirection, currentPage, pageSize, searchQuery, selectedColumns, planFilter, countryFilter, timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSort(colId: string) {
    if (sortColumn === colId) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colId);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  }

  function toggleColumn(colId: string) {
    setSelectedColumns(prev =>
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  }

  async function handleExport(format: string) {
    setExporting(true);
    setExportMenuOpen(false);
    if (data && (format === 'csv' || format === 'csv_raw')) {
      const cols = data.table.columns.filter(c => selectedColumns.includes(c.id));
      const header = cols.map(c => c.label).join(',');
      const rows = data.table.rows.map(r =>
        cols.map(c => {
          const v = r.values[c.id];
          return format === 'csv_raw' ? String(v?.value ?? '') : `"${v?.formattedValue ?? ''}"`;
        }).join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-report.${format === 'csv_raw' ? 'raw.' : ''}csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  const visibleColumns = data?.table.columns.filter(c => selectedColumns.includes(c.id)) ?? [];
  const pagination = data?.table.pagination;

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profiles
          </h1>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                {[
                  { id: 'csv', label: 'CSV' },
                  { id: 'csv_raw', label: 'CSV (Raw)' },
                  { id: 'pdf', label: 'PDF' },
                  { id: 'html', label: 'HTML' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleExport(f.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 first:rounded-t-md last:rounded-b-md"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configure Report Panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg mb-6">
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Configure Report
            </span>
            {configOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {configOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Timeframe
                  </label>
                  <TimeframeSelector value={timeframe} onChange={setTimeframe} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Performed by — Plan
                  </label>
                  <select
                    value={planFilter}
                    onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {PLAN_OPTIONS.map(p => (
                      <option key={p} value={p}>{p === 'All' ? 'All People' : p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Performed by — Country
                  </label>
                  <select
                    value={countryFilter}
                    onChange={e => { setCountryFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {COUNTRY_OPTIONS.map(c => (
                      <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Columns */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Columns
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedColumns.map(colId => {
                    const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                    if (!col) return null;
                    const isPM = col.type === 'people_metric';
                    return (
                      <span
                        key={colId}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isPM
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {col.label}
                        <button onClick={() => toggleColumn(colId)} className="hover:opacity-70" aria-label={`Remove ${col.label} column`}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <div className="relative">
                    <button
                      onClick={() => setColumnPickerOpen(!columnPickerOpen)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Column
                    </button>
                    {columnPickerOpen && (
                      <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Properties</span>
                        </div>
                        {AVAILABLE_COLUMNS.filter(c => c.type === 'property').map(col => (
                          <button key={col.id} onClick={() => toggleColumn(col.id)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span>{col.label}</span>
                            {selectedColumns.includes(col.id) ? <Minus className="w-3 h-3 text-red-500" /> : <Plus className="w-3 h-3 text-green-500" />}
                          </button>
                        ))}
                        <div className="p-2 border-t border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">People Metrics</span>
                        </div>
                        {AVAILABLE_COLUMNS.filter(c => c.type === 'people_metric').map(col => (
                          <button key={col.id} onClick={() => toggleColumn(col.id)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span>{col.label}</span>
                            {selectedColumns.includes(col.id) ? <Minus className="w-3 h-3 text-red-500" /> : <Plus className="w-3 h-3 text-green-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => { setCurrentPage(1); fetchData(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary + Search */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data ? (
              <><span className="font-semibold text-gray-900 dark:text-gray-100">{data.summary.formattedTotal}</span> profiles found</>
            ) : 'Loading...'}
          </p>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Profile Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">&nbsp;</th>
                  {visibleColumns.map(col => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.type === 'people_metric' && <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />}
                        {col.label}
                        {col.sortable && (
                          sortColumn === col.id
                            ? (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                            : <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading profiles...</td></tr>
                ) : data && data.table.rows.length > 0 ? (
                  data.table.rows.map(row => <ProfileRow key={row.profileId} row={row} columns={visibleColumns} />)
                ) : (
                  <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No profiles found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} profiles
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    page === currentPage
                      ? 'bg-red-600 text-white'
                      : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function ProfileRow({ row, columns }: { row: ProfileTableRow; columns: ProfileTableColumn[] }) {
  const nameVal = row.values['name']?.formattedValue ?? '';
  const initials = nameVal.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <td className="px-4 py-3">
        {row.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {initials ? (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{initials}</span>
            ) : (
              <User className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </td>
      {columns.map(col => {
        const cell = row.values[col.id];
        const isNumber = col.dataType === 'number';
        return (
          <td key={col.id} className={`px-4 py-3 whitespace-nowrap text-sm ${isNumber ? 'text-right font-mono text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
            {col.id === 'plan' ? <PlanBadge plan={cell?.formattedValue ?? ''} /> : (cell?.formattedValue ?? '—')}
          </td>
        );
      })}
    </tr>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    Enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    Pro: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    Free: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[plan] ?? colors.Free}`}>{plan}</span>
  );
}
