import type { SchemaDataType } from '@/lib/types/schema';

export interface DefaultEventProperty {
  field: string;
  displayName: string;
  dataType: SchemaDataType;
  icon?: string;
}

export interface DefaultEventSchema {
  eventName: string;
  displayName: string;
  description: string;
  icon?: string;
  eventType: 'Active' | 'Passive';
  properties: DefaultEventProperty[];
}

export const DEFAULT_EVENT_SCHEMAS: DefaultEventSchema[] = [
  {
    eventName: 'pv',
    displayName: 'Page view',
    description: 'User loaded a page',
    icon: 'file-text',
    eventType: 'Active',
    properties: [
      { field: 'URL', displayName: 'URL', dataType: 'string', icon: 'link' },
      { field: 'Title', displayName: 'Title', dataType: 'string', icon: 'type' },
      { field: 'URI', displayName: 'URI', dataType: 'string', icon: 'link' },
      { field: 'Scroll Depth', displayName: 'Scroll Depth', dataType: 'number', icon: 'arrow-down' },
      { field: 'domain', displayName: 'domain', dataType: 'string', icon: 'globe' },
      { field: 'returning', displayName: 'returning', dataType: 'string', icon: 'repeat' },
    ],
  },
  {
    eventName: 'button_click',
    displayName: 'Button click',
    description: 'Edit Description',
    icon: 'mouse-pointer',
    eventType: 'Active',
    properties: [
      { field: 'Title', displayName: 'Title', dataType: 'string', icon: 'type' },
      { field: 'Type', displayName: 'Type', dataType: 'string', icon: 'tag' },
      { field: 'Tag name', displayName: 'Tag name', dataType: 'string', icon: 'tag' },
      { field: 'Text', displayName: 'Text', dataType: 'string', icon: 'type' },
      { field: 'Class name', displayName: 'Class name', dataType: 'string', icon: 'code' },
      { field: 'Page URL', displayName: 'Page URL', dataType: 'string', icon: 'link' },
      { field: 'Page title', displayName: 'Page title', dataType: 'string', icon: 'file-text' },
      { field: 'Pointer type', displayName: 'Pointer type', dataType: 'string', icon: 'mouse-pointer' },
      { field: 'dom path', displayName: 'dom path', dataType: 'string', icon: 'git-branch' },
      { field: 'url', displayName: 'url', dataType: 'string', icon: 'link' },
    ],
  },
  {
    eventName: 'outgoing',
    displayName: 'Outgoing link',
    description: 'User clicked on an external link',
    icon: 'external-link',
    eventType: 'Active',
    properties: [
      { field: 'URL', displayName: 'URL', dataType: 'string', icon: 'link' },
    ],
  },
  {
    eventName: 'download',
    displayName: 'Download',
    description: 'Visitor downloaded a file',
    icon: 'download',
    eventType: 'Active',
    properties: [
      { field: 'URL', displayName: 'URL', dataType: 'string', icon: 'link' },
    ],
  },
  {
    eventName: 'label_join',
    displayName: 'Segment Join',
    description: 'Joins a segment',
    icon: 'user-plus',
    eventType: 'Active',
    properties: [
      { field: 'Id', displayName: 'Id', dataType: 'string', icon: 'hash' },
      { field: 'Name', displayName: 'Name', dataType: 'string', icon: 'tag' },
    ],
  },
  {
    eventName: 'label_leave',
    displayName: 'Segment Leave',
    description: 'Leaves a segment',
    icon: 'user-minus',
    eventType: 'Active',
    properties: [
      { field: 'Id', displayName: 'Id', dataType: 'string', icon: 'hash' },
      { field: 'Name', displayName: 'Name', dataType: 'string', icon: 'tag' },
    ],
  },
  {
    eventName: 'property_update',
    displayName: 'Property Update',
    description: 'Property Update',
    icon: 'edit',
    eventType: 'Active',
    properties: [
      { field: 'Key', displayName: 'Key', dataType: 'string', icon: 'key' },
      { field: 'Value', displayName: 'Value', dataType: 'string', icon: 'type' },
      { field: 'Last', displayName: 'Last', dataType: 'string', icon: 'clock' },
    ],
  },
];

export const DEFAULT_EVENT_SCHEMA_NAMES = new Set(DEFAULT_EVENT_SCHEMAS.map(s => s.eventName));
