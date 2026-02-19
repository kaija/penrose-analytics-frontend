'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { Zap, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronRight, Loader2, Lock } from 'lucide-react';
import type { EventPropertySchema, SchemaDataType } from '@/lib/types/schema';
import { DEFAULT_EVENT_SCHEMAS } from '@/lib/constants/default-event-schema';

const DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];

interface EventSchemaRow {
  id: string;
  eventName: string;
  displayName: string;
  icon: string | null;
  properties: EventPropertySchema[];
  createdAt: string;
  updatedAt: string;
}

interface EventSchemaClientProps {
  projectId: string;
}

const emptyProperty = (): EventPropertySchema => ({
  field: '',
  displayName: '',
  dataType: 'string',
});

export default function EventSchemaClient({ projectId }: EventSchemaClientProps) {
  const [schemas, setSchemas] = useState<EventSchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [editing, setEditing] = useState<EventSchemaRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formEventName, setFormEventName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formProperties, setFormProperties] = useState<EventPropertySchema[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSchemas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/schema/events`);
      if (!res.ok) throw new Error('Failed to load event schemas');
      const json = await res.json();
      // The GET API returns EventSchemaItem (no id). We need the DB records for edit/delete.
      // Fetch raw DB records via a simple approach: use the list and match by eventName.
      // Actually, the GET maps away the id. We'll store what we get and use eventName as key.
      // For proper CRUD we need the id — let's fetch from prisma directly via a management endpoint.
      // Since we don't have one, we'll work with what POST/PUT return (which include id).
      // On initial load, we check if data comes from DB (has updatedAt) or inference.
      const events = json.data?.events ?? [];
      // If events come from DB they won't have id in the response. We need to handle this.
      // For now, store them. Create/update will refresh the list.
      setSchemas(events.map((e: any, i: number) => ({
        id: e.id ?? `inferred-${i}`,
        eventName: e.eventName,
        displayName: e.displayName,
        icon: e.icon ?? null,
        properties: e.properties ?? [],
        createdAt: e.createdAt ?? '',
        updatedAt: e.updatedAt ?? '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  const openNew = () => {
    setEditing(null);
    setIsNew(true);
    setFormEventName('');
    setFormDisplayName('');
    setFormIcon('');
    setFormProperties([emptyProperty()]);
    setFormError(null);
  };

  const openEdit = (schema: EventSchemaRow) => {
    setEditing(schema);
    setIsNew(false);
    setFormEventName(schema.eventName);
    setFormDisplayName(schema.displayName);
    setFormIcon(schema.icon ?? '');
    setFormProperties(schema.properties.length > 0 ? [...schema.properties] : [emptyProperty()]);
    setFormError(null);
  };

  const closeForm = () => {
    setEditing(null);
    setIsNew(false);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formEventName.trim()) { setFormError('事件名稱為必填'); return; }
    if (!formDisplayName.trim()) { setFormError('顯示名稱為必填'); return; }

    const validProps = formProperties.filter(p => p.field.trim() && p.displayName.trim());

    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch(`/api/projects/${projectId}/schema/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: formEventName.trim(),
            displayName: formDisplayName.trim(),
            icon: formIcon.trim() || undefined,
            properties: validProps,
          }),
        });
        if (res.status === 409) { setFormError('此事件名稱已存在'); return; }
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error?.message ?? 'Failed to create');
        }
      } else if (editing) {
        const res = await fetch(`/api/projects/${projectId}/schema/events/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: formEventName.trim(),
            displayName: formDisplayName.trim(),
            icon: formIcon.trim() || null,
            properties: validProps,
          }),
        });
        if (res.status === 409) { setFormError('此事件名稱已存在'); return; }
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error?.message ?? 'Failed to update');
        }
      }
      closeForm();
      await fetchSchemas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schema: EventSchemaRow) => {
    if (schema.id.startsWith('inferred-')) {
      alert('推斷的 Schema 無法刪除，請先建立 DB 記錄。');
      return;
    }
    if (!window.confirm(`確定要刪除事件 "${schema.displayName}" 嗎？`)) return;
    setDeletingId(schema.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/schema/events/${schema.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSchemas(prev => prev.filter(s => s.id !== schema.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const addProperty = () => setFormProperties(prev => [...prev, emptyProperty()]);
  const removeProperty = (idx: number) => setFormProperties(prev => prev.filter((_, i) => i !== idx));
  const updateProperty = (idx: number, field: keyof EventPropertySchema, value: string) => {
    setFormProperties(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const showForm = isNew || editing !== null;

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Event Schema</h1>
          </div>
          {!showForm && (
            <button type="button" onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              <Plus className="w-4 h-4" /> 新增事件
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isNew ? '新增事件 Schema' : '編輯事件 Schema'}
              </h2>
              <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">事件名稱 *</label>
                <input type="text" value={formEventName} onChange={e => setFormEventName(e.target.value)}
                  placeholder="e.g. page_view"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">顯示名稱 *</label>
                <input type="text" value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)}
                  placeholder="e.g. Page View"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">圖示</label>
                <input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)}
                  placeholder="e.g. file-text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
            </div>

            {/* Properties */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">屬性</label>
                <button type="button" onClick={addProperty}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 新增屬性
                </button>
              </div>
              <div className="space-y-2">
                {formProperties.map((prop, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="text" value={prop.field} onChange={e => updateProperty(idx, 'field', e.target.value)}
                      placeholder="field" className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <input type="text" value={prop.displayName} onChange={e => updateProperty(idx, 'displayName', e.target.value)}
                      placeholder="Display Name" className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <select value={prop.dataType} onChange={e => updateProperty(idx, 'dataType', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                    </select>
                    <button type="button" onClick={() => removeProperty(idx)}
                      className="p-1 text-gray-400 hover:text-red-500" title="移除屬性">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                取消
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isNew ? '建立' : '儲存'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">Loading…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 py-12 text-center">{error}</div>
        )}

        {!loading && !error && schemas.length === 0 && !showForm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無事件 Schema</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">建立事件 Schema 以定義專案中的事件類型與屬性。</p>
            <button type="button" onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              <Plus className="w-4 h-4" /> 新增事件
            </button>
          </div>
        )}

        {!loading && !error && schemas.length > 0 && (
          <div className="space-y-6">
            {/* Default Event Schemas Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  系統預設事件
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">事件名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">屬性數</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {DEFAULT_EVENT_SCHEMAS.map((schema, index) => (
                      <React.Fragment key={`default-${schema.eventName}`}>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button type="button" onClick={() => setExpandedId(expandedId === `default-${schema.eventName}` ? null : `default-${schema.eventName}`)}
                              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                              {expandedId === `default-${schema.eventName}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{schema.eventName}</code>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{schema.displayName}</td>
                          <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 truncate max-w-xs">{schema.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{schema.properties.length}</td>
                        </tr>
                        {expandedId === `default-${schema.eventName}` && schema.properties.length > 0 && (
                          <tr>
                            <td colSpan={4} className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                {schema.displayName} 的屬性
                              </h3>
                              <div className="grid grid-cols-3 gap-2">
                                {schema.properties.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{p.field}</code>
                                    <span className="text-gray-400">·</span>
                                    <span>{p.dataType}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Event Schemas Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  自訂事件
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">事件名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">屬性數</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {schemas.map(schema => (
                      <React.Fragment key={schema.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button type="button" onClick={() => setExpandedId(expandedId === schema.id ? null : schema.id)}
                              className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400">
                              {expandedId === schema.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{schema.eventName}</code>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{schema.displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{schema.properties.length}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!schema.id.startsWith('inferred-') && (
                                <>
                                  <button type="button" onClick={() => openEdit(schema)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded transition-colors" title="編輯">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => handleDelete(schema)} disabled={deletingId === schema.id}
                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 rounded transition-colors" title="刪除">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === schema.id && schema.properties.length > 0 && (
                          <tr>
                            <td colSpan={4} className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                {schema.displayName} 的屬性
                              </h3>
                              <div className="grid grid-cols-3 gap-2">
                                {schema.properties.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{p.field}</code>
                                    <span className="text-gray-400">·</span>
                                    <span>{p.dataType}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
