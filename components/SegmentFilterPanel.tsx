'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, X, Search, ChevronDown, Filter as FilterIcon,
  Zap, User, FileText, MousePointer, ExternalLink, Download,
  Send, UserPlus, LogIn, ShoppingCart, Activity,
} from 'lucide-react';
import TimeframeSelector, { resolveTimeframe, type TimeframeValue } from '@/components/TimeframeSelector';
import type { EventSchemaItem, EventPropertySchema, ProfilePropertySchema, SchemaDataType } from '@/lib/types/schema';
import type {
  SegmentFilter, SegmentConstraint, SegmentAggregation,
  ConstraintOperator, AggregationMetric, AggregationOperator,
} from '@/lib/types/segment-filter';
import {
  OPERATORS_BY_TYPE, OPERATOR_LABELS, NO_VALUE_OPERATORS,
  AGGREGATION_METRIC_LABELS, AGGREGATION_OPERATOR_LABELS,
  METRICS_REQUIRING_PROPERTY,
} from '@/lib/types/segment-filter';

// --- Icon mapping ---
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': FileText, 'mouse-pointer': MousePointer, 'external-link': ExternalLink,
  download: Download, send: Send, 'user-plus': UserPlus, 'log-in': LogIn,
  'shopping-cart': ShoppingCart, activity: Activity,
};

function EventIcon({ icon, className }: { icon?: string; className?: string }) {
  const Icon = icon ? ICON_MAP[icon] : null;
  return Icon ? <Icon className={className} /> : <Zap className={className} />;
}

// --- Helpers ---
let _uid = 0;
function uid() { return `sf_${++_uid}_${Date.now()}`; }

function defaultConstraint(): SegmentConstraint {
  return { id: uid(), field: '', displayName: '', dataType: 'string', operator: 'is', values: [] };
}

function defaultAggregation(): SegmentAggregation {
  return { metric: 'count_events', operator: 'at_least', value: 1 };
}

function defaultFilter(): SegmentFilter {
  return { id: uid(), filterType: 'event', constraints: [], aggregation: defaultAggregation() };
}

const DATA_TYPE_LABELS: Record<SchemaDataType, string> = {
  string: 'Text', number: 'Number', boolean: 'Boolean', date: 'Date', duration: 'Duration',
};

// --- Dropdown wrapper ---
function Dropdown({ trigger, children, open, onClose, width = 'w-72' }: {
  trigger: React.ReactNode; children: React.ReactNode; open: boolean; onClose: () => void; width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);
  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div className={`absolute left-0 top-full mt-1 ${width} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-40 max-h-80 overflow-y-auto`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FilterSelector — choose event or property
// ============================================================
function FilterSelector({ events, profileProperties, onSelectEvent, onSelectProperty }: {
  events: EventSchemaItem[];
  profileProperties: ProfilePropertySchema[];
  onSelectEvent: (e: EventSchemaItem) => void;
  onSelectProperty: (p: ProfilePropertySchema) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const q = search.toLowerCase();
  const filteredEvents = events.filter(e => e.displayName.toLowerCase().includes(q) || e.eventName.toLowerCase().includes(q));
  const filteredProps = profileProperties.filter(p => p.displayName.toLowerCase().includes(q) || p.field.toLowerCase().includes(q));

  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      width="w-80"
      trigger={
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 w-full">
          <FilterIcon className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-left">Select filter...</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      }
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500" />
        </div>
      </div>
      {filteredEvents.length > 0 && (
        <div className="p-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Events</div>
          {filteredEvents.map(ev => (
            <button key={ev.eventName} type="button"
              onClick={() => { onSelectEvent(ev); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <EventIcon icon={ev.icon} className="w-4 h-4 text-red-500 shrink-0" />
              <span className="flex-1 text-left">{ev.displayName}</span>
              <span className="text-xs text-gray-400">{ev.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
      {filteredProps.length > 0 && (
        <div className="p-1 border-t border-gray-200 dark:border-gray-700">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Properties</div>
          {filteredProps.map(p => (
            <button key={p.field} type="button"
              onClick={() => { onSelectProperty(p); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <User className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="flex-1 text-left">{p.displayName}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{DATA_TYPE_LABELS[p.dataType]}</span>
            </button>
          ))}
        </div>
      )}
      {filteredEvents.length === 0 && filteredProps.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-400">No results</div>
      )}
    </Dropdown>
  );
}

// ============================================================
// FieldSelector — choose a property field for constraint
// ============================================================
function FieldSelector({ properties, value, onChange }: {
  properties: EventPropertySchema[] | ProfilePropertySchema[];
  value: string;
  onChange: (field: string, displayName: string, dataType: SchemaDataType) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = properties.find(p => p.field === value);
  return (
    <Dropdown open={open} onClose={() => setOpen(false)} width="w-56"
      trigger={
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 min-w-[120px]">
          <span className="flex-1 text-left truncate">{selected?.displayName || 'Property...'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>
      }
    >
      <div className="p-1">
        {properties.map(p => (
          <button key={p.field} type="button"
            onClick={() => { onChange(p.field, p.displayName, p.dataType); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
              p.field === value ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            <span className="flex-1 text-left">{p.displayName}</span>
            <span className="text-xs text-gray-400">{DATA_TYPE_LABELS[p.dataType]}</span>
          </button>
        ))}
        {properties.length === 0 && <div className="p-3 text-sm text-gray-400 text-center">No properties</div>}
      </div>
    </Dropdown>
  );
}

// ============================================================
// OperatorSelector
// ============================================================
function OperatorSelector({ dataType, value, onChange }: {
  dataType: SchemaDataType; value: ConstraintOperator; onChange: (op: ConstraintOperator) => void;
}) {
  const [open, setOpen] = useState(false);
  const operators = OPERATORS_BY_TYPE[dataType] || OPERATORS_BY_TYPE.string;
  return (
    <Dropdown open={open} onClose={() => setOpen(false)} width="w-52"
      trigger={
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 min-w-[100px]">
          <span className="flex-1 text-left truncate">{OPERATOR_LABELS[value]}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>
      }
    >
      <div className="p-1">
        {operators.map(op => (
          <button key={op} type="button"
            onClick={() => { onChange(op); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
              op === value ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            {OPERATOR_LABELS[op]}
          </button>
        ))}
      </div>
    </Dropdown>
  );
}

// ============================================================
// ValueInput — tag-style for strings, number input for numbers
// ============================================================
function ValueInput({ dataType, values, onChange, suggestedValues }: {
  dataType: SchemaDataType; values: (string | number)[]; onChange: (v: (string | number)[]) => void; suggestedValues?: string[];
}) {
  const [inputVal, setInputVal] = useState('');

  if (dataType === 'number' || dataType === 'duration') {
    return (
      <input type="number" value={values[0] ?? ''} onChange={e => onChange(e.target.value ? [Number(e.target.value)] : [])}
        placeholder="Value..."
        className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 w-24 focus:outline-none focus:ring-1 focus:ring-red-500" />
    );
  }

  if (dataType === 'date') {
    return (
      <input type="date" value={values[0] as string ?? ''} onChange={e => onChange(e.target.value ? [e.target.value] : [])}
        className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500" />
    );
  }

  // String: tag input
  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 min-w-[140px] max-w-[260px] focus-within:ring-1 focus-within:ring-red-500">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded">
          {String(v)}
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input value={inputVal} onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(inputVal); } }}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
        placeholder={values.length === 0 ? 'Type & enter...' : ''}
        list={suggestedValues ? `sv_${suggestedValues.join('_').slice(0, 20)}` : undefined}
        className="flex-1 min-w-[60px] text-sm bg-transparent text-gray-900 dark:text-gray-100 outline-none py-0.5" />
      {suggestedValues && (
        <datalist id={`sv_${suggestedValues.join('_').slice(0, 20)}`}>
          {suggestedValues.map(v => <option key={v} value={v} />)}
        </datalist>
      )}
    </div>
  );
}

// ============================================================
// ConstraintRow
// ============================================================
function ConstraintRow({ constraint, properties, onUpdate, onRemove }: {
  constraint: SegmentConstraint;
  properties: (EventPropertySchema | ProfilePropertySchema)[];
  onUpdate: (c: SegmentConstraint) => void;
  onRemove: () => void;
}) {
  const prop = properties.find(p => p.field === constraint.field);
  const needsValue = !NO_VALUE_OPERATORS.includes(constraint.operator);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FieldSelector properties={properties} value={constraint.field}
        onChange={(field, displayName, dataType) => {
          const newOps = OPERATORS_BY_TYPE[dataType];
          const op = newOps.includes(constraint.operator) ? constraint.operator : newOps[0];
          onUpdate({ ...constraint, field, displayName, dataType, operator: op, values: [] });
        }} />
      <OperatorSelector dataType={constraint.dataType} value={constraint.operator}
        onChange={op => onUpdate({ ...constraint, operator: op, values: NO_VALUE_OPERATORS.includes(op) ? [] : constraint.values })} />
      {needsValue && (
        <ValueInput dataType={constraint.dataType} values={constraint.values}
          onChange={values => onUpdate({ ...constraint, values })}
          suggestedValues={prop?.suggestedValues} />
      )}
      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 p-1" aria-label="Remove constraint">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// AggregationRow
// ============================================================
function AggregationRow({ aggregation, properties, onUpdate }: {
  aggregation: SegmentAggregation;
  properties: EventPropertySchema[];
  onUpdate: (a: SegmentAggregation) => void;
}) {
  const [metricOpen, setMetricOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const needsProperty = METRICS_REQUIRING_PROPERTY.includes(aggregation.metric);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aggregation</div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Metric */}
        <Dropdown open={metricOpen} onClose={() => setMetricOpen(false)} width="w-52"
          trigger={
            <button type="button" onClick={() => setMetricOpen(!metricOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750">
              <Plus className="w-3.5 h-3.5 text-gray-500" />
              <span>{AGGREGATION_METRIC_LABELS[aggregation.metric]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          }>
          <div className="p-1">
            {(Object.keys(AGGREGATION_METRIC_LABELS) as AggregationMetric[]).map(m => (
              <button key={m} type="button"
                onClick={() => { onUpdate({ ...aggregation, metric: m, property: METRICS_REQUIRING_PROPERTY.includes(m) ? aggregation.property : undefined }); setMetricOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                  m === aggregation.metric ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {AGGREGATION_METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </Dropdown>

        {/* Operator */}
        <Dropdown open={opOpen} onClose={() => setOpOpen(false)} width="w-40"
          trigger={
            <button type="button" onClick={() => setOpOpen(!opOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750">
              <span>{AGGREGATION_OPERATOR_LABELS[aggregation.operator]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          }>
          <div className="p-1">
            {(Object.keys(AGGREGATION_OPERATOR_LABELS) as AggregationOperator[]).map(op => (
              <button key={op} type="button"
                onClick={() => { onUpdate({ ...aggregation, operator: op }); setOpOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                  op === aggregation.operator ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {AGGREGATION_OPERATOR_LABELS[op]}
              </button>
            ))}
          </div>
        </Dropdown>

        {/* Value */}
        <input type="number" value={aggregation.value} min={0}
          onChange={e => onUpdate({ ...aggregation, value: Number(e.target.value) || 0 })}
          className="w-20 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500" />

        {aggregation.operator === 'between' && (
          <>
            <span className="text-sm text-gray-400">and</span>
            <input type="number" value={aggregation.valueTo ?? ''} min={0}
              onChange={e => onUpdate({ ...aggregation, valueTo: Number(e.target.value) || undefined })}
              className="w-20 px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </>
        )}
      </div>

      {/* Property selector for metrics that need it */}
      {needsProperty && (
        <div>
          <FieldSelector properties={properties} value={aggregation.property || ''}
            onChange={(field) => onUpdate({ ...aggregation, property: field })} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// FilterItem — one complete filter block
// ============================================================
function FilterItem({ filter, events, profileProperties, onUpdate, onRemove }: {
  filter: SegmentFilter;
  events: EventSchemaItem[];
  profileProperties: ProfilePropertySchema[];
  onUpdate: (f: SegmentFilter) => void;
  onRemove: () => void;
}) {
  const eventSchema = filter.event ? events.find(e => e.eventName === filter.event!.eventName) : null;
  const properties: (EventPropertySchema | ProfilePropertySchema)[] =
    filter.filterType === 'event' ? (eventSchema?.properties || []) : profileProperties;

  const handleSelectEvent = (ev: EventSchemaItem) => {
    onUpdate({
      ...filter,
      filterType: 'event',
      event: { eventName: ev.eventName, displayName: ev.displayName },
      property: undefined,
      constraints: [],
      aggregation: filter.aggregation || defaultAggregation(),
    });
  };

  const handleSelectProperty = (p: ProfilePropertySchema) => {
    onUpdate({
      ...filter,
      filterType: 'property',
      property: { field: p.field, displayName: p.displayName },
      event: undefined,
      constraints: [{ id: uid(), field: p.field, displayName: p.displayName, dataType: p.dataType, operator: OPERATORS_BY_TYPE[p.dataType][0], values: [] }],
      aggregation: undefined,
    });
  };

  const updateConstraint = (idx: number, c: SegmentConstraint) => {
    const next = [...filter.constraints];
    next[idx] = c;
    onUpdate({ ...filter, constraints: next });
  };

  const removeConstraint = (idx: number) => {
    onUpdate({ ...filter, constraints: filter.constraints.filter((_, i) => i !== idx) });
  };

  const addConstraint = () => {
    onUpdate({ ...filter, constraints: [...filter.constraints, defaultConstraint()] });
  };

  const isConfigured = filter.event || filter.property;
  const filterLabel = filter.filterType === 'event'
    ? filter.event?.displayName
    : filter.property?.displayName;
  const filterTypeBadge = filter.filterType === 'event' ? 'Event' : 'Property';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
      {/* Header: selected filter + type badge + remove */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {isConfigured ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex-1">
                {filter.filterType === 'event' ? (
                  <EventIcon icon={eventSchema?.icon} className="w-4 h-4 text-red-500" />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{filterLabel}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                filter.filterType === 'event'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
              }`}>{filterTypeBadge}</span>
            </div>
          ) : (
            <FilterSelector events={events} profileProperties={profileProperties}
              onSelectEvent={handleSelectEvent} onSelectProperty={handleSelectProperty} />
          )}
        </div>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1" aria-label="Remove filter">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Constraints */}
      {isConfigured && (
        <div className="space-y-2 pl-2">
          {filter.constraints.map((c, i) => (
            <ConstraintRow key={c.id} constraint={c} properties={properties}
              onUpdate={updated => updateConstraint(i, updated)}
              onRemove={() => removeConstraint(i)} />
          ))}
          <button type="button" onClick={addConstraint}
            className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-1">
            <Plus className="w-3.5 h-3.5" /> Add Constraint
          </button>
        </div>
      )}

      {/* Aggregation (event only) */}
      {filter.filterType === 'event' && filter.aggregation && eventSchema && (
        <div className="pl-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <AggregationRow aggregation={filter.aggregation} properties={eventSchema.properties}
            onUpdate={a => onUpdate({ ...filter, aggregation: a })} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SegmentFilterPanel — main exported component
// ============================================================
export interface SegmentFilterPanelProps {
  projectId: string;
  value: SegmentFilter[];
  onChange: (filters: SegmentFilter[]) => void;
  showTimeframe?: boolean;
  timeframe?: TimeframeValue;
  onTimeframeChange?: (tf: TimeframeValue) => void;
  onApply?: () => void;
}

export default function SegmentFilterPanel({
  projectId, value, onChange,
  showTimeframe = true, timeframe, onTimeframeChange, onApply,
}: SegmentFilterPanelProps) {
  const [events, setEvents] = useState<EventSchemaItem[]>([]);
  const [profileProperties, setProfileProperties] = useState<ProfilePropertySchema[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemas = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, prRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/schema/events`),
        fetch(`/api/projects/${projectId}/schema/profiles`),
      ]);
      if (evRes.ok) {
        const evJson = await evRes.json();
        setEvents(evJson.data?.events || []);
      }
      if (prRes.ok) {
        const prJson = await prRes.json();
        setProfileProperties(prJson.data?.properties || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  const updateFilter = (idx: number, f: SegmentFilter) => {
    const next = [...value];
    next[idx] = f;
    onChange(next);
  };

  const removeFilter = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const addFilter = () => {
    onChange([...value, defaultFilter()]);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-400 animate-pulse">Loading schemas...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by</span>
          <button type="button" onClick={addFilter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Filter
          </button>
        </div>

        {value.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            No filters configured. Click "New Filter" to add one.
          </div>
        )}

        {value.map((f, i) => (
          <FilterItem key={f.id} filter={f} events={events} profileProperties={profileProperties}
            onUpdate={updated => updateFilter(i, updated)} onRemove={() => removeFilter(i)} />
        ))}
      </div>

      {/* Timeframe */}
      {showTimeframe && timeframe && onTimeframeChange && (
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe</span>
          <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        </div>
      )}

      {/* Apply */}
      {onApply && (
        <button type="button" onClick={onApply}
          className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
          Apply
        </button>
      )}
    </div>
  );
}
