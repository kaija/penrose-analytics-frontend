export type SchemaDataType = 'string' | 'number' | 'boolean' | 'date' | 'duration';

// --- Event Schema ---

export interface EventSchemaResponse {
  events: EventSchemaItem[];
}

export interface EventSchemaItem {
  eventName: string;
  displayName: string;
  icon?: string;
  count: number;
  properties: EventPropertySchema[];
}

export interface EventPropertySchema {
  field: string;
  displayName: string;
  dataType: SchemaDataType;
  icon?: string;
  suggestedValues?: string[];
}

// --- Profile Schema ---

export interface ProfileSchemaResponse {
  properties: ProfilePropertySchema[];
}

export interface ProfilePropertySchema {
  field: string;
  displayName: string;
  dataType: SchemaDataType;
  icon?: string;
  category?: string;
  suggestedValues?: string[];
}
