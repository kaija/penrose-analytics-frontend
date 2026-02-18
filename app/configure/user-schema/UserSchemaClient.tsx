'use client';

import { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { User, Plus, Pencil, Trash2, X, Save, Loader2, Lock, Calculator, Sigma } from 'lucide-react';
import { DEFAULT_USER_SCHEMA } from '@/lib/constants/default-user-schema';
import type { UserSchema, CreateUserSchemaDTO, UserSchemaType } from '@/lib/types/user-schema';
import AggregateSchemaForm from './components/AggregateSchemaForm';
import FormulaSchemaForm from './components/FormulaSchemaForm';

interface UserSchemaClientProps {
  projectId: string;
}

export default function UserSchemaClient({ projectId }: UserSchemaClientProps) {
  const [schemas, setSchemas] = useState<UserSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserSchema | null>(null);
  const [schemaType, setSchemaType] = useState<UserSchemaType>('aggregate');

  const fetchSchemas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/schema/users`);
      if (!res.ok) throw new Error('Failed to load user schemas');
      const data = await res.json();
      setSchemas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  const openNew = (type: UserSchemaType) => {
    setEditing(null);
    setSchemaType(type);
    setShowForm(true);
  };

  const openEdit = (schema: UserSchema) => {
    setEditing(schema);
    setSchemaType(schema.schemaType);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (schema: UserSchema) => {
    if (!window.confirm(`確定要刪除計算欄位 "${schema.displayName}" 嗎？`)) return;
    setDeletingId(schema.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/schema/users/${schema.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchSchemas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
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
            <User className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Schema</h1>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <button type="button" onClick={() => openNew('aggregate')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
                <Sigma className="w-4 h-4" /> 新增聚合欄位
              </button>
              <button type="button" onClick={() => openNew('formula')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-md transition-colors">
                <Calculator className="w-4 h-4" /> 新增公式欄位
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          User Schema 代表由 Property 產生的計算欄位。支援兩種類型：
          <span className="font-medium text-red-600 dark:text-red-400"> 聚合運算</span>（基於事件統計）和
          <span className="font-medium text-cyan-400"> 自訂公式</span>（使用 DSL 計算）。
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editing ? '編輯計算欄位' : schemaType === 'aggregate' ? '新增聚合欄位' : '新增公式欄位'}
              </h2>
              <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {schemaType === 'aggregate' ? (
              <AggregateSchemaForm
                projectId={projectId}
                editing={editing}
                onSuccess={() => { closeForm(); fetchSchemas(); }}
                onCancel={closeForm}
              />
            ) : (
              <FormulaSchemaForm
                projectId={projectId}
                editing={editing}
                onSuccess={() => { closeForm(); fetchSchemas(); }}
                onCancel={closeForm}
              />
            )}
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
            {/* Default Properties Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  系統預設屬性（Properties）
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">型別</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Computed Schemas Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  計算欄位（Schemas）
                </h2>
              </div>

              {schemas.length === 0 && !showForm && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    尚無計算欄位，點擊上方按鈕建立聚合欄位或公式欄位。
                  </p>
                </div>
              )}

              {schemas.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">欄位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">顯示名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">類型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">說明</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">資料型別</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {schemas.map(schema => (
                        <tr key={schema.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-100">{schema.field}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{schema.displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {schema.schemaType === 'aggregate' ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                                <Sigma className="w-3 h-3" /> 聚合
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded">
                                <Calculator className="w-3 h-3" /> 公式
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{schema.description ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{schema.dataType}</span>
                          </td>
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
