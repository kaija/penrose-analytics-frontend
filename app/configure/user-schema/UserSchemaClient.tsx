'use client';

import { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { User, Plus, Pencil, Trash2, X, Save, Loader2, Lock } from 'lucide-react';
import type { SchemaDataType } from '@/lib/types/schema';
import { DEFAULT_USER_SCHEMA, DEFAULT_USER_SCHEMA_FIELDS } from '@/lib/constants/default-user-schema';

const DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];
const CATEGORIES = ['identity', 'demographics', 'behavior', 'account', 'system', 'custom'];

interface ProfileSchemaRow {
  id: string;
  field: string;
  displayName: string;
  dataType: SchemaDataType;
  icon: string | null;
  category: string | null;
  suggestedValues: string[] | null;
}

interface UserSchemaClientProps {
  projectId: string;
}

export default function UserSchemaClient({ projectId }: UserSchemaClientProps) {
  const [customSchemas, setCustomSchemas] = useState<ProfileSchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [editing, setEditing] = useState<ProfileSchemaRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formField, setFormField] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDataType, setFormDataType] = useState<SchemaDataType>('string');
  const [formIcon, setFormIcon] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSuggestedValues, setFormSuggestedValues] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSchemas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/schema/profiles`);
      if (!res.ok) throw new Error('Failed to load profile schemas');
      const json = await res.json();
      const properties = json.data?.properties ?? [];
      // Filter out default schema fields — only keep user-created ones
      const custom = properties
        .filter((p: any) => !DEFAULT_USER_SCHEMA_FIELDS.has(p.field) && p.id && !p.id.startsWith?.('inferred'))
        .map((p: any) => ({
          id: p.id,
          field: p.field,
          displayName: p.displayName,
          dataType: p.dataType as SchemaDataType,
          icon: p.icon ?? null,
          category: p.category ?? null,
          suggestedValues: p.suggestedValues ?? null,
        }));
      setCustomSchemas(custom);
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
    setFormField('');
    setFormDisplayName('');
    setFormDataType('string');
    setFormIcon('');
    setFormCategory('');
    setFormSuggestedValues('');
    setFormError(null);
  };

  const openEdit = (schema: ProfileSchemaRow) => {
    setEditing(schema);
    setIsNew(false);
    setFormField(schema.field);
    setFormDisplayName(schema.displayName);
    setFormDataType(schema.dataType);
    setFormIcon(schema.icon ?? '');
    setFormCategory(schema.category ?? '');
    setFormSuggestedValues(schema.suggestedValues?.join(', ') ?? '');
    setFormError(null);
  };

  const closeForm = () => {
    setEditing(null);
    setIsNew(false);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formField.trim()) { setFormError('欄位名稱為必填'); return; }
    if (!formDisplayName.trim()) { setFormError('顯示名稱為必填'); return; }
    if (DEFAULT_USER_SCHEMA_FIELDS.has(formField.trim())) {
      setFormError('此欄位名稱為系統預設屬性，無法使用');
      return;
    }

    const suggestedValues = formSuggestedValues.trim()
      ? formSuggestedValues.split(',').map(v => v.trim()).filter(Boolean)
      : undefined;

    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch(`/api/projects/${projectId}/schema/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: formField.trim(),
            displayName: formDisplayName.trim(),
            dataType: formDataType,
            icon: formIcon.trim() || undefined,
            category: formCategory.trim() || undefined,
            suggestedValues,
          }),
        });
        if (res.status === 409) { setFormError('此欄位名稱已存在'); return; }
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error?.message ?? 'Failed to create');
        }
      } else if (editing) {
        const res = await fetch(`/api/projects/${projectId}/schema/profiles/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: formField.trim(),
            displayName: formDisplayName.trim(),
            dataType: formDataType,
            icon: formIcon.trim() || null,
            category: formCategory.trim() || null,
            suggestedValues: suggestedValues ?? null,
          }),
        });
        if (res.status === 409) { setFormError('此欄位名稱已存在'); return; }
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

  const handleDelete = async (schema: ProfileSchemaRow) => {
    if (!window.confirm(`確定要刪除屬性 "${schema.displayName}" 嗎？`)) return;
    setDeletingId(schema.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/schema/profiles/${schema.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setCustomSchemas(prev => prev.filter(s => s.id !== schema.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const showForm = isNew || editing !== null;

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Schema</h1>
          </div>
          {!showForm && (
            <button type="button" onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              <Plus className="w-4 h-4" /> 新增屬性
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isNew ? '新增自訂屬性' : '編輯自訂屬性'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">欄位名稱 *</label>
                <input type="text" value={formField} onChange={e => setFormField(e.target.value)}
                  placeholder="e.g. plan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">顯示名稱 *</label>
                <input type="text" value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)}
                  placeholder="e.g. Plan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">資料型別 *</label>
                <select value={formDataType} onChange={e => setFormDataType(e.target.value as SchemaDataType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分類</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option value="">（無）</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">圖示</label>
                <input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)}
                  placeholder="e.g. credit-card"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">建議值（逗號分隔）</label>
                <input type="text" value={formSuggestedValues} onChange={e => setFormSuggestedValues(e.target.value)}
                  placeholder="e.g. free, pro, enterprise"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
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

        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">Loading…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 py-12 text-center">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Default Schema Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">系統預設屬性</h2>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">型別</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">分類</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {DEFAULT_USER_SCHEMA.map(prop => (
                      <tr key={prop.field} className="bg-gray-50/50 dark:bg-gray-800/30">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{prop.field}</code>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{prop.displayName}</td>
                        <td className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500 truncate max-w-xs">{prop.description}</td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">{prop.dataType}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">{prop.category ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Schema Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">自訂屬性</h2>
              </div>

              {customSchemas.length === 0 && !showForm && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">尚無自訂屬性，點擊上方「新增屬性」按鈕建立。</p>
                </div>
              )}

              {customSchemas.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">型別</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">分類</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {customSchemas.map(schema => (
                        <tr key={schema.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-100">{schema.field}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{schema.displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{schema.dataType}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{schema.category ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => openEdit(schema)}
                                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded transition-colors" title="編輯">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => handleDelete(schema)} disabled={deletingId === schema.id}
                                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 rounded transition-colors" title="刪除">
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
          </div>
        )}
      </div>
    </MainLayout>
  );
}
