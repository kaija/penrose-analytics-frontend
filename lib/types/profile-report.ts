// --- Common ---

export interface PerformedByFilter {
  segmentId?: string;
  conditions?: FilterGroup;
}

export interface FilterGroup {
  operator: 'and' | 'or';
  rules: (FilterRule | FilterGroup)[];
}

export interface FilterRule {
  field: string;
  operator: 'is' | 'is_not' | 'contains' | 'gt' | 'lt' | 'between';
  values: (string | number)[];
}

// --- Columns ---

export interface PropertyColumn {
  type: 'property';
  field: string;
  label: string;
}

export interface PeopleMetricColumn {
  type: 'people_metric';
  id: string;
  label: string;
  event: string;
  operation: PeopleMetricOperation;
  property?: string;
  formula?: string;
}

export type PeopleMetricOperation =
  | 'count' | 'sum' | 'count_unique' | 'last_touch'
  | 'first_touch' | 'top' | 'mean' | 'min' | 'max' | 'formula';

export type ReportColumn = PropertyColumn | PeopleMetricColumn;

// --- Request ---

export interface ProfileReportRequest {
  timeRange: { from: string; to: string };
  performedBy: PerformedByFilter;
  columns: ReportColumn[];
  sort?: { columnId: string; direction: 'asc' | 'desc' };
  pagination?: { page: number; pageSize: number };
  search?: string;
}

// --- Response ---

export interface ProfileReportResponse {
  schemaVersion: 'report.profile.v1';
  summary: ProfileSummary;
  table: ProfileTable;
}

export interface ProfileSummary {
  totalProfiles: number;
  formattedTotal: string;
}

export interface ProfileTable {
  columns: ProfileTableColumn[];
  rows: ProfileTableRow[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface ProfileTableColumn {
  id: string;
  label: string;
  type: 'property' | 'people_metric';
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sortable: boolean;
  currentSort?: 'asc' | 'desc' | null;
}

export interface ProfileTableRow {
  profileId: string;
  avatar?: string | null;
  values: Record<string, { value: string | number | boolean | null; formattedValue: string }>;
}
