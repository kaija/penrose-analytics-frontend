'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Info } from 'lucide-react';
import type { UserSchema } from '@/lib/types/user-schema';
import type { SchemaDataType } from '@/lib/types/schema';

const DATA_TYPES: SchemaDataType[] = ['string', 'number', 'boolean', 'date', 'duration'];

const FORMULA_EXAMPLES = [
  { label: '字串連接', formula: 'CAT(first_name, " ", last_name)' },
  { label: '條件判斷', formula: 'IF(total_spent > 10000, "Gold", IF(total_spent > 5000, "Silver", "Bronze"))' },
  { label: '數學運算', formula: 'MATH(visits_90_d / 90)' },
];

interface Props {
  projectId: string;
  editing: UserSchema | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormulaSchemaForm({ projectId, editing, onSuccess, onCancel }: Props) {
  const [field, setField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [formula, setFormula] = useState('');
  const [dataType, setDataType] = useState<SchemaDataType>('string');
  const [format, setFormat] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setField(editing.field);
      setDisplayName(editing.displayName);
      setDescription(editing.description ?? '');
      setFormula(editing.formula ?? '');
      setDataType(editing.dataType as SchemaDataType);
      setFormat(editing.format ?? '');
    }
  }, [editing]);

  const handleSave = async () => {
    setError(null);
    
    if (!field.trim()) { setError('欄位名稱為必填'); return; }
    if (!displayName.trim()) { setError('顯示名稱為必填'); return; }
    if (!formula.trim()) { setError('公式為必填'); return; }
    if (!/^[a-z][a-z0-9_]*$/.test(field.trim())) {
      setError('欄位名稱必須以小寫字母開頭，只能包含小寫字母、數字和底線');
      return;
    }

    const body = {
      field: field.trim(),
      displayName: displayName.trim(),
      description: description.trim() || undefined,
      schemaType: 'formula' as const,
      formula: formula.trim(),
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
              placeholder="e.g. full_name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">顯示名稱 *</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Full Name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">說明</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Concatenation of first and last name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
        </div>

        {/* Formula */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">公式 *</label>
          <textarea value={formula} onChange={e => setFormula(e.target.value)}
            rows={4}
            placeholder='e.g. CAT(first_name, " ", last_name)'
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono" />
          
          <div className="mt-2 p-3 bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded text-sm">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-cyan-700 dark:text-cyan-300">
                <div className="font-medium mb-1">支援的函數：</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li><code className="bg-cyan-100 dark:bg-cyan-900 px-1 rounded">CAT(str1, str2, ...)</code> - 字串連接</li>
                  <li><code className="bg-cyan-100 dark:bg-cyan-900 px-1 rounded">IF(condition, true_value, false_value)</code> - 條件判斷</li>
                  <li><code className="bg-cyan-100 dark:bg-cyan-900 px-1 rounded">MATH(expression)</code> - 數學運算</li>
                  <li><code className="bg-cyan-100 dark:bg-cyan-900 px-1 rounded">DATE(expression)</code> - 日期運算</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">範例：</div>
            <div className="flex flex-wrap gap-2">
              {FORMULA_EXAMPLES.map((ex, i) => (
                <button key={i} type="button" onClick={() => setFormula(ex.formula)}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  {ex.label}
                </button>
              ))}
            </div>
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
                placeholder="e.g. Uppercase"
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
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editing ? '儲存' : '建立'}
        </button>
      </div>
    </div>
  );
}
