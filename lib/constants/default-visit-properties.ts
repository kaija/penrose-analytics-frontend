import type { SchemaDataType } from '@/lib/types/schema';

export interface DefaultVisitProperty {
  field: string;
  displayName: string;
  description: string;
  dataType: SchemaDataType;
  icon?: string;
  category: 'location' | 'device' | 'time' | 'referrer' | 'behavior';
}

export const DEFAULT_VISIT_PROPERTIES: DefaultVisitProperty[] = [
  // Location properties
  { field: 'city', displayName: 'City', description: 'Based on GeoIP', dataType: 'string', icon: 'map', category: 'location' },
  { field: 'state_region', displayName: 'State/Region', description: 'Based on GeoIP', dataType: 'string', icon: 'map-pin', category: 'location' },
  { field: 'country', displayName: 'Country', description: 'Based on GeoIP', dataType: 'string', icon: 'flag', category: 'location' },
  { field: 'continent', displayName: 'Continent', description: 'Based on GeoIP', dataType: 'string', icon: 'globe', category: 'location' },
  { field: 'time_zone', displayName: 'Time Zone', description: '(ex: America/Los_Angeles)', dataType: 'string', icon: 'clock', category: 'location' },
  { field: 'time_zone_offset', displayName: 'Time Zone Offset', description: '(ex: +08:00)', dataType: 'string', icon: 'clock', category: 'location' },
  
  // Device properties
  { field: 'device_type', displayName: 'Device Type', description: 'Desktop, Tablet or Mobile', dataType: 'string', icon: 'monitor', category: 'device' },
  { field: 'ip_address', displayName: 'IP Address', description: 'IP Address', dataType: 'string', icon: 'wifi', category: 'device' },
  { field: 'screen_resolution', displayName: 'Screen Resolution', description: '(ex: 2560x1440)', dataType: 'string', icon: 'maximize', category: 'device' },
  { field: 'language', displayName: 'Language', description: 'Operating System/web browser preferences on device', dataType: 'string', icon: 'globe', category: 'device' },
  { field: 'operating_system', displayName: 'Operating System', description: 'Operating System', dataType: 'string', icon: 'monitor', category: 'device' },
  { field: 'browser', displayName: 'Browser', description: 'Web Browser', dataType: 'string', icon: 'chrome', category: 'device' },
  
  // Time properties
  { field: 'visit_datetime', displayName: 'Visit Date/Time', description: 'Date/Time the visit began', dataType: 'date', icon: 'calendar', category: 'time' },
  { field: 'hour_of_visit', displayName: 'Hour of Visit', description: 'Date/Time the visit began', dataType: 'number', icon: 'clock', category: 'time' },
  { field: 'day_of_visit', displayName: 'Day of Visit', description: 'Date/Time the visit began', dataType: 'string', icon: 'calendar', category: 'time' },
  { field: 'week_of_visit', displayName: 'Week of Visit', description: 'Date/Time the visit began', dataType: 'string', icon: 'calendar', category: 'time' },
  { field: 'month_of_visit', displayName: 'Month of Visit', description: 'Date/Time the visit began', dataType: 'string', icon: 'calendar', category: 'time' },
  { field: 'year_of_visit', displayName: 'Year of Visit', description: 'Date/Time the visit began', dataType: 'string', icon: 'calendar', category: 'time' },
  { field: 'visit_duration', displayName: 'Duration of Visit', description: 'Duration of the visit in seconds', dataType: 'duration', icon: 'clock', category: 'time' },
  
  // Referrer properties
  { field: 'referrer_type', displayName: 'Referrer Type', description: 'Direct, Search Engine, Social Networks, Email, Back Links, Internal or PPC', dataType: 'string', icon: 'external-link', category: 'referrer' },
  { field: 'referrer_query', displayName: 'Referrer Query (search referrals)', description: 'Search engine query or click identifier (such as gclid) for PPC; may be "-encrypted-" because HTTPS referrer data is limited due to privacy', dataType: 'string', icon: 'search', category: 'referrer' },
  { field: 'referrer_url', displayName: 'Referrer URL', description: 'URL of referrer; may exclude path and query because HTTPS referrer data is limited due to privacy', dataType: 'string', icon: 'link', category: 'referrer' },
  { field: 'landing_page_path', displayName: 'Landing Page Path', description: 'Path of the URL for the first pageview of this visit', dataType: 'string', icon: 'file-text', category: 'referrer' },
  
  // Behavior properties
  { field: 'total_events_per_visit', displayName: 'Total # of Events per Visit', description: 'Number of events in the visit', dataType: 'number', icon: 'hash', category: 'behavior' },
  { field: 'is_first_visit', displayName: 'Is First Visit', description: 'Whether this is the first visit for this user', dataType: 'boolean', icon: 'star', category: 'behavior' },
];

export const DEFAULT_VISIT_PROPERTY_FIELDS = new Set(DEFAULT_VISIT_PROPERTIES.map(p => p.field));

export const DEFAULT_VISIT_PROPERTIES_BY_CATEGORY = {
  location: DEFAULT_VISIT_PROPERTIES.filter(p => p.category === 'location'),
  device: DEFAULT_VISIT_PROPERTIES.filter(p => p.category === 'device'),
  time: DEFAULT_VISIT_PROPERTIES.filter(p => p.category === 'time'),
  referrer: DEFAULT_VISIT_PROPERTIES.filter(p => p.category === 'referrer'),
  behavior: DEFAULT_VISIT_PROPERTIES.filter(p => p.category === 'behavior'),
};
