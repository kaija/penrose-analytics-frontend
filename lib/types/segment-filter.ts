import type { SchemaDataType } from './schema';

/** 單一 Segment Filter 的完整定義 */
export interface SegmentFilter {
  id: string;
  filterType: 'event' | 'property';
  event?: { eventName: string; displayName: string };
  property?: { field: string; displayName: string };
  constraints: SegmentConstraint[];
  aggregation?: SegmentAggregation;
}

/** 單一約束條件 */
export interface SegmentConstraint {
  id: string;
  field: string;
  displayName: string;
  dataType: SchemaDataType;
  operator: ConstraintOperator;
  values: (string | number)[];
}

/** 運算子 */
export type ConstraintOperator =
  | 'is' | 'is_not'
  | 'contains' | 'does_not_contain'
  | 'starts_with' | 'does_not_start_with'
  | 'ends_with' | 'does_not_end_with'
  | 'matches_regexp'
  | 'exists' | 'does_not_exist'
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than'
  | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'between'
  | 'before' | 'after' | 'on'
  | 'is_true' | 'is_false';

export const OPERATORS_BY_TYPE: Record<SchemaDataType, ConstraintOperator[]> = {
  string: [
    'is', 'is_not', 'contains', 'does_not_contain',
    'starts_with', 'does_not_start_with',
    'ends_with', 'does_not_end_with',
    'matches_regexp', 'exists', 'does_not_exist',
  ],
  number: [
    'equals', 'not_equals', 'greater_than', 'less_than',
    'greater_than_or_equal', 'less_than_or_equal',
    'between', 'exists', 'does_not_exist',
  ],
  boolean: ['is_true', 'is_false'],
  date: ['before', 'after', 'on', 'between', 'exists', 'does_not_exist'],
  duration: [
    'equals', 'not_equals', 'greater_than', 'less_than',
    'between', 'exists', 'does_not_exist',
  ],
};

export const OPERATOR_LABELS: Record<ConstraintOperator, string> = {
  is: 'is', is_not: 'is not',
  contains: 'contains', does_not_contain: 'does not contain',
  starts_with: 'starts with', does_not_start_with: 'does not start with',
  ends_with: 'ends with', does_not_end_with: 'does not end with',
  matches_regexp: 'matches regexp',
  exists: 'exists', does_not_exist: 'does not exist',
  equals: '=', not_equals: '≠',
  greater_than: '>', less_than: '<',
  greater_than_or_equal: '≥', less_than_or_equal: '≤',
  between: 'between',
  before: 'before', after: 'after', on: 'on',
  is_true: 'is true', is_false: 'is false',
};

/** 不需要值輸入的運算子 */
export const NO_VALUE_OPERATORS: ConstraintOperator[] = [
  'exists', 'does_not_exist', 'is_true', 'is_false',
];

/** 聚合設定 */
export interface SegmentAggregation {
  metric: AggregationMetric;
  operator: AggregationOperator;
  value: number;
  valueTo?: number;
  property?: string;
}

export type AggregationMetric =
  | 'count_events' | 'count_unique_events'
  | 'sum' | 'mean' | 'min' | 'max';

export const AGGREGATION_METRIC_LABELS: Record<AggregationMetric, string> = {
  count_events: 'Count Events',
  count_unique_events: 'Count Unique Events',
  sum: 'Sum', mean: 'Mean', min: 'Min', max: 'Max',
};

/** 需要選擇 property 的 metric */
export const METRICS_REQUIRING_PROPERTY: AggregationMetric[] = [
  'count_unique_events', 'sum', 'mean', 'min', 'max',
];

export type AggregationOperator = 'at_least' | 'at_most' | 'exactly' | 'between';

export const AGGREGATION_OPERATOR_LABELS: Record<AggregationOperator, string> = {
  at_least: 'at least', at_most: 'at most',
  exactly: 'exactly', between: 'between',
};

/** 完整的 Segment 篩選配置 */
export interface SegmentFilterConfig {
  filters: SegmentFilter[];
  timeRange: { from: string; to: string };
}
