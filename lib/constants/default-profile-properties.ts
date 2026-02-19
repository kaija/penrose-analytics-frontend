import type { SchemaDataType } from '@/lib/types/schema';

export interface DefaultProfileProperty {
  field: string;
  displayName: string;
  description: string;
  dataType: SchemaDataType;
  icon?: string;
  category: 'identity' | 'demographics' | 'behavior' | 'account' | 'system';
}

export const DEFAULT_PROFILE_PROPERTIES: DefaultProfileProperty[] = [
  // Identity properties
  { field: 'email', displayName: 'Email', description: 'User email address', dataType: 'string', icon: 'mail', category: 'identity' },
  { field: 'name', displayName: 'Name', description: 'User full name', dataType: 'string', icon: 'user', category: 'identity' },
  { field: 'first_name', displayName: 'First Name', description: 'User first name', dataType: 'string', icon: 'user', category: 'identity' },
  { field: 'last_name', displayName: 'Last Name', description: 'User last name', dataType: 'string', icon: 'user', category: 'identity' },
  { field: 'phone', displayName: 'Phone', description: 'User phone number', dataType: 'string', icon: 'phone', category: 'identity' },
  
  // Demographics properties
  { field: 'country', displayName: 'Country', description: 'User country', dataType: 'string', icon: 'flag', category: 'demographics' },
  { field: 'city', displayName: 'City', description: 'User city', dataType: 'string', icon: 'map', category: 'demographics' },
  { field: 'region', displayName: 'Region', description: 'User region or state', dataType: 'string', icon: 'map-pin', category: 'demographics' },
  { field: 'company', displayName: 'Company', description: 'User company name', dataType: 'string', icon: 'building', category: 'demographics' },
  { field: 'title', displayName: 'Job Title', description: 'User job title', dataType: 'string', icon: 'briefcase', category: 'demographics' },
  
  // Behavior properties
  { field: 'last_seen', displayName: 'Last Seen', description: 'Last time the user was active', dataType: 'date', icon: 'clock', category: 'behavior' },
  { field: 'first_seen', displayName: 'First Seen', description: 'First time the user was seen', dataType: 'date', icon: 'calendar', category: 'behavior' },
  { field: 'total_sessions', displayName: 'Total Sessions', description: 'Total number of sessions', dataType: 'number', icon: 'activity', category: 'behavior' },
  { field: 'total_events', displayName: 'Total Events', description: 'Total number of events', dataType: 'number', icon: 'zap', category: 'behavior' },
  { field: 'avg_session_length', displayName: 'Avg Session Length', description: 'Average session duration', dataType: 'duration', icon: 'clock', category: 'behavior' },
  { field: 'avg_screens_per_session', displayName: 'Avg Screens per Session', description: 'Average number of screens viewed per session', dataType: 'number', icon: 'monitor', category: 'behavior' },
  { field: 'stickiness', displayName: 'Stickiness', description: 'User engagement score', dataType: 'number', icon: 'trending-up', category: 'behavior' },
  
  // Account properties
  { field: 'signup_date', displayName: 'Signup Date', description: 'Date when user signed up', dataType: 'date', icon: 'calendar', category: 'account' },
  { field: 'plan', displayName: 'Plan', description: 'User subscription plan', dataType: 'string', icon: 'credit-card', category: 'account' },
  { field: 'account_status', displayName: 'Account Status', description: 'Current account status', dataType: 'string', icon: 'check-circle', category: 'account' },
  
  // System properties
  { field: 'browser', displayName: 'Browser', description: 'User browser', dataType: 'string', icon: 'globe', category: 'system' },
  { field: 'os', displayName: 'Operating System', description: 'User operating system', dataType: 'string', icon: 'monitor', category: 'system' },
  { field: 'device', displayName: 'Device', description: 'User device type', dataType: 'string', icon: 'smartphone', category: 'system' },
  { field: 'language', displayName: 'Language', description: 'User preferred language', dataType: 'string', icon: 'globe', category: 'system' },
];

export const DEFAULT_PROFILE_PROPERTY_FIELDS = new Set(DEFAULT_PROFILE_PROPERTIES.map(p => p.field));

export const DEFAULT_PROFILE_PROPERTIES_BY_CATEGORY = {
  identity: DEFAULT_PROFILE_PROPERTIES.filter(p => p.category === 'identity'),
  demographics: DEFAULT_PROFILE_PROPERTIES.filter(p => p.category === 'demographics'),
  behavior: DEFAULT_PROFILE_PROPERTIES.filter(p => p.category === 'behavior'),
  account: DEFAULT_PROFILE_PROPERTIES.filter(p => p.category === 'account'),
  system: DEFAULT_PROFILE_PROPERTIES.filter(p => p.category === 'system'),
};
