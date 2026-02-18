import type { SchemaDataType } from '@/lib/types/schema';

export interface DefaultUserSchemaProperty {
  field: string;
  displayName: string;
  description: string;
  dataType: SchemaDataType;
  icon?: string;
  category?: string;
}

export const DEFAULT_USER_SCHEMA: DefaultUserSchemaProperty[] = [
  { field: 'email', displayName: 'Email', description: 'User email address', dataType: 'string', icon: 'mail', category: 'identity' },
  { field: 'company', displayName: 'Company', description: "User's company name", dataType: 'string', icon: 'building', category: 'identity' },
  { field: 'name', displayName: 'Name', description: 'User or customer name', dataType: 'string', icon: 'user', category: 'identity' },
  { field: 'recent_region', displayName: 'Most Recent Region', description: 'Most Recent Region', dataType: 'string', icon: 'map-pin', category: 'demographics' },
  { field: 'actions_90_d', displayName: 'Events Last 90 Days', description: 'Events Last 90 Days', dataType: 'number', icon: 'activity', category: 'behavior' },
  { field: 'visits_90_d', displayName: 'Visits Last 90 Days', description: 'Visits Last 90 Days', dataType: 'number', icon: 'bar-chart-2', category: 'behavior' },
  { field: 'timespent_90_d', displayName: 'Time Spent Last 90 Days', description: 'Time Spent Last 90 Days', dataType: 'duration', icon: 'clock', category: 'behavior' },
  { field: 'unique_ips', displayName: 'Unique IP Addresses', description: 'Unique IP Addresses', dataType: 'number', icon: 'globe', category: 'system' },
  { field: 'recent_country', displayName: 'Most Recent Country', description: 'Most Recent Country', dataType: 'string', icon: 'flag', category: 'demographics' },
  { field: 'recent_city', displayName: 'Most Recent City', description: 'Most Recent City', dataType: 'string', icon: 'map', category: 'demographics' },
  { field: 'last_seen', displayName: 'Last Seen', description: 'Last Seen', dataType: 'date', icon: 'clock', category: 'behavior' },
  { field: 'online', displayName: 'Online', description: 'Online', dataType: 'boolean', icon: 'wifi', category: 'behavior' },
  { field: 'avg_session_screens', displayName: 'Avg Screens per Session', description: 'Measures what a user is doing during the session, how many screens they view', dataType: 'number', icon: 'monitor', category: 'behavior' },
  { field: 'avg_session_length', displayName: 'Avg Session Length', description: 'Session length is the average time that a user spends in your app per session', dataType: 'duration', icon: 'clock', category: 'behavior' },
  { field: 'stickiness', displayName: 'Stickiness', description: "A 'stickiness' ratio of 50% would mean that the user of your app is active every other day", dataType: 'number', icon: 'trending-up', category: 'behavior' },
];

export const DEFAULT_USER_SCHEMA_FIELDS = new Set(DEFAULT_USER_SCHEMA.map(s => s.field));
