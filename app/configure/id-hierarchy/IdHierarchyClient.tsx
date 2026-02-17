'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_IDENTITIES, validateCodeName } from '@/lib/constants/default-identities';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, X, Save } from 'lucide-react';

interface IdHierarchyItem {
  id: string;
  displayName: string;
  codeName: string;
  priority: number;
  isCustom: boolean;
}

interface IdHierarchyClientProps {
  projectId: string;
  userRole: string;
}

function SortableItem({ item, onDelete, canEdit }: { 
  item: IdHierarchyItem; 
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {!canEdit && (
        <div className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {item.displayName}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          {item.codeName}
        </div>
      </div>
      {item.isCustom && canEdit && (
        <button
          onClick={() => onDelete(item.id)}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function IdHierarchyClient({ projectId, userRole }: IdHierarchyClientProps) {
  const [activeItems, setActiveItems] = useState<IdHierarchyItem[]>([]);
  const [originalItems, setOriginalItems] = useState<IdHierarchyItem[]>([]);
  const [availableItems, setAvailableItems] = useState<typeof DEFAULT_IDENTITIES[number][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [customCodeName, setCustomCodeName] = useState('');
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadIdHierarchy();
  }, [projectId]);

  const loadIdHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/id-hierarchy`);
      if (!response.ok) throw new Error('Failed to load ID hierarchy');

      const result = await response.json();
      const data = result.data || [];
      setActiveItems(data);
      setOriginalItems(data);
      setHasChanges(false);

      const usedCodeNames = new Set(data.map((item: IdHierarchyItem) => item.codeName));
      const available = DEFAULT_IDENTITIES.filter(
        (identity) => !usedCodeNames.has(identity.codeName)
      );
      setAvailableItems(available);
    } catch (err) {
      console.error('Error loading ID hierarchy:', err);
      setError('Failed to load ID hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canEdit) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeItems.findIndex((item) => item.id === active.id);
      const newIndex = activeItems.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(activeItems, oldIndex, newIndex);
      setActiveItems(newItems);
      setHasChanges(true);
    }
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      setError('');
      const itemsWithPriority = activeItems.map((item, index) => ({
        id: item.id,
        priority: index,
      }));

      const response = await fetch(`/api/projects/${projectId}/id-hierarchy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsWithPriority }),
      });

      if (!response.ok) throw new Error('Failed to save order');

      const result = await response.json();
      const updated = result.data || [];
      setActiveItems(updated);
      setOriginalItems(updated);
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving order:', err);
      setError('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setActiveItems(originalItems);
    setHasChanges(false);
  };

  const addFromAvailable = async (identity: typeof DEFAULT_IDENTITIES[number]) => {
    if (!canEdit) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/id-hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: identity.displayName,
          codeName: identity.codeName,
          isCustom: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to add identity');

      await loadIdHierarchy();
    } catch (err) {
      console.error('Error adding identity:', err);
      setError('Failed to add identity');
    }
  };

  const addCustomIdentity = async () => {
    if (!canEdit) return;

    setError('');

    if (!customDisplayName.trim() || !customCodeName.trim()) {
      setError('Display name and code name are required');
      return;
    }

    if (!validateCodeName(customCodeName)) {
      setError('Code name must match pattern: [a-z]+[_a-z0-9]*');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/id-hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: customDisplayName,
          codeName: customCodeName,
          isCustom: true,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to add custom identity');
      }

      setCustomDisplayName('');
      setCustomCodeName('');
      setShowCustomForm(false);
      await loadIdHierarchy();
    } catch (err: any) {
      console.error('Error adding custom identity:', err);
      setError(err.message || 'Failed to add custom identity');
    }
  };

  const deleteIdentity = async (id: string) => {
    if (!canEdit) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/id-hierarchy?itemId=${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete identity');

      await loadIdHierarchy();
    } catch (err) {
      console.error('Error deleting identity:', err);
      setError('Failed to delete identity');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Save Button */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ID Hierarchy
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理用戶識別碼的優先順序。拖拉調整順序，越上面優先權越高。
          </p>
          {!canEdit && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              您只有查看權限。需要 Owner、Admin 或 Editor 角色才能編輯。
            </p>
          )}
        </div>
        {hasChanges && canEdit && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={cancelChanges}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={saveOrder}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active IDs (2/3 width) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Active IDs
          </h2>

          {activeItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              No IDs configured. {canEdit && 'Add from available options on the right.'}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <SortableItem 
                      key={item.id} 
                      item={item} 
                      onDelete={deleteIdentity}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column - Available IDs & Custom ID (1/3 width) */}
        <div className="space-y-6">
          {/* Available IDs */}
          {canEdit && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Available IDs
              </h2>
              {availableItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  All default identities have been added.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((identity) => (
                    <button
                      key={identity.codeName}
                      onClick={() => addFromAvailable(identity)}
                      className="w-full flex items-center gap-2 p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {identity.displayName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {identity.codeName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom ID */}
          {canEdit && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Custom ID
              </h2>
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Identity
                </button>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      New Custom Identity
                    </h3>
                    <button
                      onClick={() => {
                        setShowCustomForm(false);
                        setCustomDisplayName('');
                        setCustomCodeName('');
                        setError('');
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={customDisplayName}
                        onChange={(e) => setCustomDisplayName(e.target.value)}
                        placeholder="e.g., User UUID"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Code Name
                      </label>
                      <input
                        type="text"
                        value={customCodeName}
                        onChange={(e) => setCustomCodeName(e.target.value)}
                        placeholder="e.g., user_uuid"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Pattern: [a-z]+[_a-z0-9]*
                      </p>
                    </div>
                    <button
                      onClick={addCustomIdentity}
                      className="w-full px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Add Custom Identity
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
