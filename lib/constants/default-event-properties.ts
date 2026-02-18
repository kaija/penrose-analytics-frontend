import type { SchemaDataType } from '@/lib/types/schema';

export interface DefaultEventProperty {
  field: string;
  displayName: string;
  description: string;
  dataType: SchemaDataType;
  icon?: string;
  category: 'metadata' | 'campaign' | 'technical' | 'behavioral';
}

export const DEFAULT_EVENT_PROPERTIES: DefaultEventProperty[] = [
  // Metadata properties
  { field: 'event_duration', displayName: 'Event Duration', description: 'Duration of the event in seconds; automatically set for page view events', dataType: 'duration', icon: 'clock', category: 'metadata' },
  { field: 'event_timestamp', displayName: 'Event Timestamp', description: 'When the event took place', dataType: 'date', icon: 'calendar', category: 'metadata' },
  { field: 'event_name', displayName: 'Event Name', description: 'Key of the event', dataType: 'string', icon: 'tag', category: 'metadata' },
  { field: 'event_display_name', displayName: 'Event Display Name', description: 'Display name of the event as defined in the schema', dataType: 'string', icon: 'type', category: 'metadata' },
  
  // Campaign properties
  { field: 'triggerable', displayName: 'Triggerable', description: 'Whether the event can cause a trigger to execute', dataType: 'boolean', icon: 'zap', category: 'campaign' },
  { field: 'utm_campaign', displayName: 'Campaign Name', description: 'The specific product promotion or strategic campaign (utm_campaign)', dataType: 'string', icon: 'megaphone', category: 'campaign' },
  { field: 'utm_source', displayName: 'Campaign Source', description: 'Which site sent the traffic (utm_source)', dataType: 'string', icon: 'external-link', category: 'campaign' },
  { field: 'utm_medium', displayName: 'Campaign Medium', description: 'What type of link was used, such as cost per click or email (utm_medium)', dataType: 'string', icon: 'link', category: 'campaign' },
  { field: 'utm_content', displayName: 'Campaign Content', description: 'What specifically was clicked to bring the user to the site (utm_content)', dataType: 'string', icon: 'file-text', category: 'campaign' },
  { field: 'utm_term', displayName: 'Campaign Term', description: 'Search terms (utm_term)', dataType: 'string', icon: 'search', category: 'campaign' },
  { field: 'utm_id', displayName: 'Campaign ID', description: 'The campaign ID (utm_id)', dataType: 'string', icon: 'hash', category: 'campaign' },
  
  // Technical properties
  { field: 'domain', displayName: 'Domain', description: 'Domain running the tracker script', dataType: 'string', icon: 'globe', category: 'technical' },
  { field: 'integration', displayName: 'Integration', description: 'Library or integration used to track this event', dataType: 'string', icon: 'package', category: 'technical' },
  { field: 'app', displayName: 'App', description: 'Appier App ID', dataType: 'string', icon: 'smartphone', category: 'technical' },
  { field: 'platform', displayName: 'Platform', description: 'The platform this event was tracked from (web, ios, android, etc.)', dataType: 'string', icon: 'monitor', category: 'technical' },
  { field: 'is_https', displayName: 'Is HTTPS', description: 'Whether the event was tracked securely over SSL/TLS', dataType: 'boolean', icon: 'lock', category: 'technical' },
  { field: 'event_type', displayName: 'Event Type', description: 'Active, Passive or System', dataType: 'string', icon: 'activity', category: 'technical' },
  
  // Behavioral properties
  { field: 'is_first_event_in_visit', displayName: 'Is First Event In Visit', description: 'Whether this is the first event in the visit', dataType: 'boolean', icon: 'play', category: 'behavioral' },
  { field: 'is_last_event_in_visit', displayName: 'Is Last Event In Visit', description: 'Whether this is the last event in the visit', dataType: 'boolean', icon: 'stop', category: 'behavioral' },
  { field: 'is_first_event', displayName: 'Is First Event', description: 'Whether this is the first event the user has made', dataType: 'boolean', icon: 'star', category: 'behavioral' },
  { field: 'is_current_event', displayName: 'Is Current Event', description: 'Whether this is the most recent event in the active visit', dataType: 'boolean', icon: 'circle', category: 'behavioral' },
];

export const DEFAULT_EVENT_PROPERTY_FIELDS = new Set(DEFAULT_EVENT_PROPERTIES.map(p => p.field));

export const DEFAULT_EVENT_PROPERTIES_BY_CATEGORY = {
  metadata: DEFAULT_EVENT_PROPERTIES.filter(p => p.category === 'metadata'),
  campaign: DEFAULT_EVENT_PROPERTIES.filter(p => p.category === 'campaign'),
  technical: DEFAULT_EVENT_PROPERTIES.filter(p => p.category === 'technical'),
  behavioral: DEFAULT_EVENT_PROPERTIES.filter(p => p.category === 'behavioral'),
};
