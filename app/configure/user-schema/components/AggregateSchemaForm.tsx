'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X } from 'lucide-react';
import type { UserSchema, AggregateSchemaConfig, AggregateOperation, EventFilterCondition } from '@/lib/types/user-schema';
import type { SchemaDataType } from '@/lib/types/schema';

const OPERATIONS: { value: AggregateOperation; label: string }[] = [
  { value: 'count', label: 'Count - 計算事件次數' },
  { value: 'sum', label: 'Sum - 加總數值' },
  { value: 'count_unique', label: 'Count Unique - 計算唯一次數' },
  { value: 'mean', label: 'Mean - 平均值' },
  { value: 'min', label: 'Min - 最小值' },
  { value: 'max', label: 'Max - 最大值' },
  { value: 'last_touch', label: 'Last Touch - 最後一次值' },
  { value: 'first_touch', label: 'First Touch - 第一次值' },
  { value: 'top', label: 'Top - 最常出現的值' },
];

const DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];

interface Props {
  projectId: string;
  editing: UserSchema | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface EventSchema {
  id?: string;
  eventName: string;
  displayName: string;
  properties?: Array<{
    field: string;
    displayName: string;
    dataType: string;
  }>;
}

export default function AggregateSchemaForm({ projectId, editing, onSuccess, onCancel }: Props) {
  const [field, setField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState<SchemaDataType>('number');
  const [format, setFormat] = useState('');

  // Aggregate config
  const [operation, setOperation] = useState<AggregateOperation>('count');
  const [timeframeValue, setTimeframeValue] = useState(90);
  const [timeframeUnit, setTimeframeUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [eventNameMode, setEventNameMode] = useState<'select' | 'custom'>('select');
  const [eventName, setEventName] = useState('');
  const [eventProperty, setEventProperty] = useState('');
  const [eventPropertyMode, setEventPropertyMode] = useState<'select' | 'custom'>('select');
  const [aggregateBy, setAggregateBy] = useState<'unique' | 'total'>('total');
  const [filters, setFilters] = useState<EventFilterCondition[]>([]);

  // Event schemas from API
  const [eventSchemas, setEventSchemas] = useState<EventSchema[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);

  // Get properties for selected event
  const selectedEventSchema = eventSchemas.find(s => s.eventName === eventName);
  const availableProperties = selectedEventSchema?.properties || [];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event schemas
  useEffect(() => {
    const fetchEventSchemas = async () => {
      try {
        setLoadingSchemas(true);
        const res = await fetch(`/api/projects/${projectId}/schema/events`);
        if (res.ok) {
          const json = await res.json();
          // API returns { data: { events: [...] } } or { events: [...] }
          const events = json.data?.events || json.events || [];
          setEventSchemas(Array.isArray(events) ? events : []);
        }
      } catch (err) {
        console.error('Failed to load event schemas:', err);
      } finally {
        setLoadingSchemas(false);
      }
    };
    fetchEventSchemas();
  }, [projectId]);

  useEffect(() => {
    if (editing) {
      setField(editing.field);
      setDisplayName(editing.displayName);
      setDescription(editing.description ?? '');
      setDataType(editing.dataType as SchemaDataType);
      setFormat(editing.format ?? '');

      if (editing.aggregateConfig) {
        const config = editing.aggregateConfig;
        setOperation(config.operation);
        if (config.timeframe.type === 'relative') {
          setTimeframeValue(config.timeframe.value ?? 90);
          setTimeframeUnit(config.timeframe.unit ?? 'days');
        }
        const eventNameValue = config.eventName ?? '';
        setEventName(eventNameValue);
        // Check if the event name exists in schemas
        if (eventNameValue && eventSchemas.some(s => s.eventName === eventNameValue)) {
          setEventNameMode('select');
        } else if (eventNameValue) {
          setEventNameMode('custom');
        }
        setEventProperty(config.eventProperty ?? '');
        setAggregateBy(config.aggregateBy ?? 'total');
        setFilters(config.filters ?? []);
      }
    }
  }, [editing, eventSchemas]);

  const addFilter = () => {
    setFilters([...filters, { property: '', operator: 'is', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<EventFilterCondition>) => {
    setFilters(filters.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const handleSave = async () => {
    setError(null);

    if (!field.trim()) { setError('欄位名稱為必填'); return; }
    if (!displayName.trim()) { setError('顯示名稱為必填'); return; }
    if (!/^[a-z][a-z0-9_]*$/.test(field.trim())) {
      setError('欄位名稱必須以小寫字母開頭，只能包含小寫字母、數字和底線');
      return;
    }

    const aggregateConfig: AggregateSchemaConfig = {
      operation,
      timeframe: {
        type: 'relative',
        value: timeframeValue,
        unit: timeframeUnit,
      },
      eventName: eventName.trim() || undefined,
      eventProperty: eventProperty.trim() || undefined,
      aggregateBy,
      filters: filters.length > 0 ? filters : undefined,
    };

    const body = {
      field: field.trim(),
      displayName: displayName.trim(),
      description: description.trim() || undefined,
      schemaType: 'aggregate' as const,
      aggregateConfig,
      dataType,
      format: format.trim() || undefined,
    };

    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${projectId}/schema/users/${editing.id}`
        : `/api/projects/${projectId}/schema/users`;
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setError('此欄位名稱已存在');
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? 'Failed to save');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">欄位名稱 *</label>
            <input type="text" value={field} onChange={e => setField(e.target.value)}
              disabled={!!editing}
              placeholder="e.g. total_spent_90d"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">顯示名稱 *</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Total Spent (90 days)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">說明</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Sum of purchase amounts in the last 90 days"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
        </div>

        {/* Aggregate Config */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">聚合設定</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">運算類型 *</label>
              <select value={operation} onChange={e => setOperation(e.target.value as AggregateOperation)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                {OPERATIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">時間範圍</label>
              <div className="flex gap-2">
                <input type="number" value={timeframeValue} onChange={e => setTimeframeValue(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
                <select value={timeframeUnit} onChange={e => setTimeframeUnit(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  <option value="days">天</option>
                  <option value="weeks">週</option>
                  <option value="months">月</option>
                  <option value="years">年</option>
                </select>
              </div>
            </div>

            {/* Event Name with mode selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">事件名稱</label>
              <div className="flex gap-2 mb-2">
                <button type="button"
                  onClick={() => { setEventNameMode('select'); setEventName(''); }}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    eventNameMode === 'select'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  從列表選擇
                </button>
                <button type="button"
                  onClick={() => { setEventNameMode('custom'); setEventName(''); }}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    eventNameMode === 'custom'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  自行輸入
                </button>
              </div>

              {eventNameMode === 'select' ? (
                <select value={eventName} onChange={e => setEventName(e.target.value)}
                  disabled={loadingSchemas}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50">
                  <option value="">任何事件</option>
                  {eventSchemas.map((schema, index) => (
                    <option key={schema.id || `event-${index}`} value={schema.eventName}>
                      {schema.displayName} ({schema.eventName})
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={eventName} onChange={e => setEventName(e.target.value)}
                  placeholder="輸入事件名稱，留空表示任何事件"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">事件屬性</label>
              <div className="flex gap-2 mb-2">
                <button type="button"
                  onClick={() => { setEventPropertyMode('select'); setEventProperty(''); }}
                  disabled={!eventName || availableProperties.length === 0}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    eventPropertyMode === 'select'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  從列表選擇
                </button>
                <button type="button"
                  onClick={() => { setEventPropertyMode('custom'); setEventProperty(''); }}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    eventPropertyMode === 'custom'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  自行輸入
                </button>
              </div>

              {eventPropertyMode === 'select' ? (
                <select value={eventProperty} onChange={e => setEventProperty(e.target.value)}
                  disabled={!eventName || availableProperties.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50">
                  <option value="">選擇屬性</option>
                  {availableProperties.map((prop, index) => (
                    <option key={`${prop.field}-${index}`} value={prop.field}>
                      {prop.displayName} ({prop.field}) - {prop.dataType}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={eventProperty} onChange={e => setEventProperty(e.target.value)}
                  placeholder="e.g. amount"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              )}
              {eventPropertyMode === 'select' && !eventName && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">請先選擇事件名稱</p>
              )}
              {eventPropertyMode === 'select' && eventName && availableProperties.length === 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">此事件沒有定義屬性</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">篩選條件</label>
              <button type="button" onClick={addFilter}
                className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">
                <Plus className="w-3 h-3" /> 新增條件
              </button>
            </div>
            {filters.map((filter, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input type="text" value={filter.property} onChange={e => updateFilter(index, { property: e.target.value })}
                  placeholder="屬性名稱"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
                <select value={filter.operator} onChange={e => updateFilter(index, { operator: e.target.value as any })}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                  <option value="contains">contains</option>
                  <option value="greater_than">&gt;</option>
                  <option value="less_than">&lt;</option>
                </select>
                <input type="text" value={filter.value} onChange={e => updateFilter(index, { value: e.target.value })}
                  placeholder="值"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
                <button type="button" onClick={() => removeFilter(index)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Type */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">資料型別 *</label>
              <select value={dataType} onChange={e => setDataType(e.target.value as SchemaDataType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">格式</label>
              <input type="text" value={format} onChange={e => setFormat(e.target.value)}
                placeholder="e.g. Human Readable"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
          取消
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editing ? '儲存' : '建立'}
        </button>
      </div>
    </div>
  );
}
