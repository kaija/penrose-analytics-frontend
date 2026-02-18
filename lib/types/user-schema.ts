import type { SchemaDataType } from './schema';

// User Schema Types
export type UserSchemaType = 'aggregate' | 'formula';

// Aggregate operation types
export type AggregateOperation = 
  | 'count'        // Count total occurrences
  | 'sum'          // Sum numeric values
  | 'count_unique' // Count unique occurrences
  | 'last_touch'   // Last value
  | 'top'          // Most frequent value
  | 'mean'         // Average
  | 'min'          // Minimum value
  | 'max'          // Maximum value
  | 'first_touch'; // First value

// Timeframe configuration
export interface TimeframeConfig {
  type: 'relative' | 'absolute';
  // For relative
  value?: number;
  unit?: 'days' | 'weeks' | 'months' | 'years';
  // For absolute
  startDate?: string;
  endDate?: string;
}

// Event filter condition
export interface EventFilterCondition {
  property: string;
  operator: 'is' | 'is_not' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal';
  value: string | number | boolean;
}

// Aggregate schema configuration
export interface AggregateSchemaConfig {
  operation: AggregateOperation;
  timeframe: TimeframeConfig;
  eventName?: string; // null means "Any Event"
  eventProperty?: string; // The property to aggregate (for sum, mean, etc.)
  filters?: EventFilterCondition[];
  aggregateBy?: 'unique' | 'total'; // For counting
}

// User schema (computed field)
export interface UserSchema {
  id: string;
  projectId: string;
  field: string;
  displayName: string;
  description?: string;
  schemaType: UserSchemaType;
  
  // For aggregate type
  aggregateConfig?: AggregateSchemaConfig;
  
  // For formula type
  formula?: string;
  
  dataType: SchemaDataType;
  format?: string;
  icon?: string;
  category?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Create/Update DTOs
export interface CreateUserSchemaDTO {
  field: string;
  displayName: string;
  description?: string;
  schemaType: UserSchemaType;
  aggregateConfig?: AggregateSchemaConfig;
  formula?: string;
  dataType: SchemaDataType;
  format?: string;
  icon?: string;
  category?: string;
}

export interface UpdateUserSchemaDTO {
  displayName?: string;
  description?: string;
  aggregateConfig?: AggregateSchemaConfig;
  formula?: string;
  dataType?: SchemaDataType;
  format?: string;
  icon?: string;
  category?: string;
}

// Validation helpers
export function validateAggregateConfig(config: AggregateSchemaConfig): string[] {
  const errors: string[] = [];
  
  if (!config.operation) {
    errors.push('Operation is required');
  }
  
  if (!config.timeframe) {
    errors.push('Timeframe is required');
  }
  
  // Operations that require eventProperty
  const requiresProperty = ['sum', 'mean', 'min', 'max', 'last_touch', 'first_touch', 'top'];
  if (requiresProperty.includes(config.operation) && !config.eventProperty) {
    errors.push(`Operation '${config.operation}' requires an event property`);
  }
  
  return errors;
}

export function validateFormula(formula: string): string[] {
  const errors: string[] = [];
  
  if (!formula || formula.trim().length === 0) {
    errors.push('Formula cannot be empty');
  }
  
  // Basic syntax validation (can be expanded)
  const validFunctions = ['CAT', 'IF', 'MATH', 'DATE', 'SUM', 'COUNT', 'AVG'];
  const hasValidFunction = validFunctions.some(fn => formula.includes(fn));
  
  if (!hasValidFunction) {
    errors.push('Formula must contain at least one valid function');
  }
  
  return errors;
}
