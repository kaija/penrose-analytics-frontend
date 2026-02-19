'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyEventData {
  month: string;
  count: number;
}

interface EventUsageResponse {
  projectId: string;
  data: MonthlyEventData[];
  isSimulated: boolean;
}

interface EventUsageChartProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export default function EventUsageChart({ projectId, projectName, onClose }: EventUsageChartProps) {
  const [data, setData] = useState<MonthlyEventData[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/super-admin/events/${projectId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch event data');
        }

        const result: EventUsageResponse = await response.json();
        setData(result.data);
        setIsSimulated(result.isSimulated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [projectId]);

  // Format month for display (e.g., "2024-01" -> "Jan 2024")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Prepare data for chart
  const chartData = data.map(item => ({
    month: formatMonth(item.month),
    events: item.count,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Event Usage
            </h3>
            {isSimulated && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠ Showing simulated data (no actual events found)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Loading event data...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">No event data available</div>
          </div>
        ) : (
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Event Count', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#F3F4F6',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="events"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={{ fill: '#DC2626', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Events"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
