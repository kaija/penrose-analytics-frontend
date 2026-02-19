'use client';

import { useState, useEffect } from 'react';
import { History, User, Calendar, Filter, ChevronDown, ChevronRight, Lock, Unlock, UserPlus, UserMinus, FileText, Trash2, Edit, FilePlus, Database, Settings } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  details: {
    resourceId?: string;
    resourceName?: string;
    resourceType?: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    error?: string;
  };
}

interface ProjectHistoryClientProps {
  projectId: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login.success': 'Logged in',
  'auth.login.failure': 'Login failed',
  'auth.logout': 'Logged out',
  'project.create': 'Created project',
  'project.update': 'Updated project',
  'project.delete': 'Deleted project',
  'project.switch': 'Switched project',
  'member.invite': 'Invited member',
  'member.update': 'Updated member role',
  'member.remove': 'Removed member',
  'member.accept_invitation': 'Accepted invitation',
  'schema.event.create': 'Created event schema',
  'schema.event.update': 'Updated event schema',
  'schema.event.delete': 'Deleted event schema',
  'schema.user.create': 'Created user schema',
  'schema.user.update': 'Updated user schema',
  'schema.user.delete': 'Deleted user schema',
  'segment.create': 'Created segment',
  'segment.update': 'Updated segment',
  'segment.delete': 'Deleted segment',
  'dashboard.create': 'Created dashboard',
  'dashboard.update': 'Updated dashboard',
  'dashboard.delete': 'Deleted dashboard',
  'report.create': 'Created report',
  'report.update': 'Updated report',
  'report.delete': 'Deleted report',
  'profile.create': 'Created profile',
  'profile.update': 'Updated profile',
  'profile.delete': 'Deleted profile',
  'event.create': 'Created event',
  'event.update': 'Updated event',
  'event.delete': 'Deleted event',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'auth.login.success': <Unlock className="w-4 h-4" />,
  'auth.login.failure': <Lock className="w-4 h-4" />,
  'auth.logout': <Lock className="w-4 h-4" />,
  'project.create': <FilePlus className="w-4 h-4" />,
  'project.update': <Edit className="w-4 h-4" />,
  'project.delete': <Trash2 className="w-4 h-4" />,
  'member.invite': <UserPlus className="w-4 h-4" />,
  'member.update': <User className="w-4 h-4" />,
  'member.remove': <UserMinus className="w-4 h-4" />,
  'schema.event.create': <FilePlus className="w-4 h-4" />,
  'schema.event.update': <Edit className="w-4 h-4" />,
  'schema.event.delete': <Trash2 className="w-4 h-4" />,
  'schema.user.create': <FilePlus className="w-4 h-4" />,
  'schema.user.update': <Edit className="w-4 h-4" />,
  'schema.user.delete': <Trash2 className="w-4 h-4" />,
  'segment.create': <FilePlus className="w-4 h-4" />,
  'segment.update': <Edit className="w-4 h-4" />,
  'segment.delete': <Trash2 className="w-4 h-4" />,
  'dashboard.create': <FilePlus className="w-4 h-4" />,
  'dashboard.update': <Edit className="w-4 h-4" />,
  'dashboard.delete': <Trash2 className="w-4 h-4" />,
  'report.create': <FilePlus className="w-4 h-4" />,
  'report.update': <Edit className="w-4 h-4" />,
  'report.delete': <Trash2 className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  'auth.login.success': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950',
  'auth.login.failure': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950',
  'auth.logout': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  'project.create': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950',
  'project.update': 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950',
  'project.delete': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950',
  'member.invite': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950',
  'member.update': 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950',
  'member.remove': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950',
};

export default function ProjectHistoryClient({ projectId }: ProjectHistoryClientProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filterActions, setFilterActions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [projectId]);

  useEffect(() => {
    // Apply client-side filtering
    if (filterActions.length === 0) {
      setLogs(allLogs);
    } else {
      const filtered = allLogs.filter(log => {
        // Check if any filter matches the action
        return filterActions.some(filter => {
          // For exact matches like 'auth.login.success'
          if (log.action === filter) return true;
          // For prefix matches like 'segment' matching 'segment.create'
          if (log.action.startsWith(filter + '.')) return true;
          return false;
        });
      });
      setLogs(filtered);
    }
  }, [filterActions, allLogs]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/audit-logs?limit=100`);
      if (!res.ok) throw new Error('Failed to load audit logs');

      const data = await res.json();
      setAllLogs(data.data.logs);
      setLogs(data.data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (action: string) => {
    setFilterActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const clearFilters = () => {
    setFilterActions([]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    for (const key in ACTION_COLORS) {
      if (action.startsWith(key)) return ACTION_COLORS[key];
    }
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  };

  const getActionIcon = (action: string) => {
    for (const key in ACTION_ICONS) {
      if (action.startsWith(key)) return ACTION_ICONS[key];
    }
    return <FileText className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading audit logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Filter className="w-4 h-4" />
            Filters
            {filterActions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs rounded-full">
                {filterActions.length} active
              </span>
            )}
            {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {filterActions.length > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Showing {logs.length} of {allLogs.length} logs
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Authentication */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Authentication
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('auth.login.success')}
                      onChange={() => toggleFilter('auth.login.success')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Login Success
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('auth.login.failure')}
                      onChange={() => toggleFilter('auth.login.failure')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Login Failure
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('auth.logout')}
                      onChange={() => toggleFilter('auth.logout')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Logout
                  </label>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Members
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('member.invite')}
                      onChange={() => toggleFilter('member.invite')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Invite Member
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('member.update')}
                      onChange={() => toggleFilter('member.update')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Update Member
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('member.remove')}
                      onChange={() => toggleFilter('member.remove')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Remove Member
                  </label>
                </div>
              </div>

              {/* Schema */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Schema
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('schema.event')}
                      onChange={() => toggleFilter('schema.event')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Event Schema
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('schema.user')}
                      onChange={() => toggleFilter('schema.user')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    User Schema
                  </label>
                </div>
              </div>

              {/* Content */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Content
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('segment')}
                      onChange={() => toggleFilter('segment')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Segments
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('dashboard')}
                      onChange={() => toggleFilter('dashboard')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Dashboards
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('report')}
                      onChange={() => toggleFilter('report')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Reports
                  </label>
                </div>
              </div>

              {/* Data */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Data
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('profile')}
                      onChange={() => toggleFilter('profile')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Profiles
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('event')}
                      onChange={() => toggleFilter('event')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Events
                  </label>
                </div>
              </div>

              {/* Project */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Project
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActions.includes('project')}
                      onChange={() => toggleFilter('project')}
                      className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    />
                    Project Actions
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs List */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No audit logs found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Activity logs will appear here as actions are performed
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content - Single Line */}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
                        {log.user.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>

                      {log.details.resourceName && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          <span className="font-medium">{log.details.resourceName}</span>
                          {log.details.resourceType && (
                            <span className="text-gray-500 dark:text-gray-500 ml-1">
                              ({log.details.resourceType})
                            </span>
                          )}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-auto">
                        <Calendar className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Expand button */}
                    {(log.details.changes || log.details.metadata || log.details.userAgent || log.details.ipAddress) && (
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                      >
                        {expandedLog === log.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedLog === log.id && (
                  <div className="mt-3 ml-14 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-xs">
                    {log.details.ipAddress && (
                      <div className="mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">IP Address: </span>
                        <span className="text-gray-600 dark:text-gray-400">{log.details.ipAddress}</span>
                      </div>
                    )}
                    {log.details.changes && (
                      <div className="mb-2">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Changes:</div>
                        <pre className="text-gray-600 dark:text-gray-400 overflow-x-auto">
                          {JSON.stringify(log.details.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.details.metadata && (
                      <div className="mb-2">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Metadata:</div>
                        <pre className="text-gray-600 dark:text-gray-400 overflow-x-auto">
                          {JSON.stringify(log.details.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.details.userAgent && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">User Agent:</div>
                        <div className="text-gray-600 dark:text-gray-400 break-all">{log.details.userAgent}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
