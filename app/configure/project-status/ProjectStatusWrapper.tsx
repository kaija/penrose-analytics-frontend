'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import ConfigureSidebar from '../ConfigureSidebar';
import { TrendingUp } from 'lucide-react';

interface ProjectStatusWrapperProps {
  projectId: string;
}

interface WeeklyData {
  weekLabel: string;
  weekStart: string;
  eventCount: number;
  userCount: number;
}

export default function ProjectStatusWrapper({ projectId }: ProjectStatusWrapperProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyData();
  }, [projectId]);

  const loadWeeklyData = async () => {
    try {
      setLoading(true);
      
      // Mock data - last 10 weeks
      const mockData: WeeklyData[] = [];
      const today = new Date();
      
      for (let i = 9; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7));
        
        const weekNum = getWeekNumber(weekStart);
        const month = weekStart.toLocaleDateString('en-US', { month: 'short' });
        
        mockData.push({
          weekLabel: `${month} W${weekNum}`,
          weekStart: weekStart.toISOString().split('T')[0],
          eventCount: Math.floor(Math.random() * 50000) + 10000,
          userCount: Math.floor(Math.random() * 5000) + 1000,
        });
      }
      
      setWeeklyData(mockData);
    } catch (err) {
      console.error('Error loading weekly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get all values and calculate range
  const allValues = [...weeklyData.map(d => d.eventCount), ...weeklyData.map(d => d.userCount)];
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const minValue = 0;
  
  // Generate Y-axis labels
  const yAxisMax = Math.ceil(maxValue * 1.1 / 10000) * 10000;
  const yAxisLabels = [
    yAxisMax,
    Math.round(yAxisMax * 0.75),
    Math.round(yAxisMax * 0.5),
    Math.round(yAxisMax * 0.25),
    0
  ];

  return (
    <MainLayout leftSidebar={<ConfigureSidebar />}>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Project Status
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading data...
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Audience Overview (Last 10 Weeks)
            </h2>

            {/* Chart */}
            <div className="flex gap-4">
              {/* Y-axis */}
              <div className="w-16 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 text-right" style={{ height: '320px' }}>
                {yAxisLabels.map((label, i) => (
                  <div key={i}>{formatNumber(label)}</div>
                ))}
              </div>

              {/* Chart area */}
              <div className="flex-1">
                {/* Grid and bars */}
                <div className="relative" style={{ height: '320px' }}>
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"
                      style={{ top: `${i * 25}%` }}
                    />
                  ))}

                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-between gap-2">
                    {weeklyData.map((week) => {
                      const eventHeightPx = (week.eventCount / yAxisMax) * 320;
                      const userHeightPx = (week.userCount / yAxisMax) * 320;
                      
                      return (
                        <div key={week.weekStart} className="flex-1 h-full flex items-end justify-center gap-0.5">
                          {/* User bar */}
                          <div className="flex-1 group relative">
                            <div
                              className="w-full bg-teal-500 hover:bg-teal-600 rounded-t cursor-pointer transition-colors"
                              style={{ height: `${userHeightPx}px` }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {week.weekLabel}<br/>
                                Users: {week.userCount.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Event bar */}
                          <div className="flex-1 group relative">
                            <div
                              className="w-full bg-red-600 hover:bg-red-700 rounded-t cursor-pointer transition-colors"
                              style={{ height: `${eventHeightPx}px` }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {week.weekLabel}<br/>
                                Events: {week.eventCount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {weeklyData.map((week) => (
                    <div key={week.weekStart} className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400">
                      {week.weekLabel}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">New Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Events</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
