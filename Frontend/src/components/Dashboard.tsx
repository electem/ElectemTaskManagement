// src/components/Dashboard.tsx
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "@/lib/api";

interface MetricsRecord {
  startDate: string;
  endDate: string;
  cycleEfficiency: number;
  deliveryRatePerDay: number;
  reworkRatio: number;
  completedTaskCount: number;
  totalReopened: number;
  completedCount: number;
  computedAt: string;
}

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsRecord[]>([]);
  const [period, setPeriod] = useState("weekly");
  const [selectedDev, setSelectedDev] = useState(
    localStorage.getItem("username") || "101"
  );
  const [allDevelopers, setAllDevelopers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem("role");
  const isAdmin = userRole === "admin";

  // Fetch list of developers for admin dropdown
  const fetchDevelopers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/api/users/users");
      setAllDevelopers(res.data.map((u: any) => u.username));
    } catch (error) {
      console.error("Error fetching developers:", error);
    }
  };

  // Fetch metrics for selected developer and period
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/metrics/developer/${selectedDev}?period=${period}`
      );
      setMetrics(res.data.records);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [period, selectedDev]);

  const latest = metrics[metrics.length - 1];

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Period: ${formatDate(label)}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center text-sm" style={{ color: entry.color }}>
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
              {`${entry.name}: ${entry.value}${entry.dataKey === 'cycleEfficiency' || entry.dataKey === 'reworkRatio' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Developer Metrics Dashboard</h1>
          <p className="text-gray-600">Track and analyze development performance metrics</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {isAdmin && (
              <div className="w-full sm:w-64"> {/* Reduced width */}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Developer
                </label>
                <select
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  value={selectedDev}
                  onChange={(e) => setSelectedDev(e.target.value)}
                >
                  {allDevelopers.map((dev) => (
                    <option key={dev} value={dev}>{`Developer ${dev}`}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full sm:w-48"> {/* Reduced width */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Cycle Efficiency</h3>
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">{latest.cycleEfficiency}%</p>
              <p className="text-blue-100 text-sm">
                {latest.completedTaskCount} Tasks Completed
              </p>
              <div className="mt-4 w-full bg-blue-400 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-1000"
                  style={{ width: `${Math.min(latest.cycleEfficiency, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Delivery Rate</h3>
                <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center">
                  <span className="text-lg">🚀</span>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">{latest.deliveryRatePerDay}/day</p>
              <p className="text-green-100 text-sm">
                {latest.completedCount} Total Completed
              </p>
              <div className="mt-4 flex items-center">
                <span className="text-green-200 text-sm">Performance</span>
                <div className="ml-2 flex-1 bg-green-400 rounded-full h-2">
                  <div
                    className="bg-white rounded-full h-2 transition-all duration-1000"
                    style={{ width: `${Math.min(latest.deliveryRatePerDay * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Rework Ratio</h3>
                <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">{latest.reworkRatio}%</p>
              <p className="text-red-100 text-sm">
                {latest.totalReopened} Reopened Tasks
              </p>
              <div className="mt-4 w-full bg-red-400 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-1000"
                  style={{ width: `${Math.min(latest.reworkRatio, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Trend Charts */}
        {metrics.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Performance Trends</h3>
              <span className="text-sm text-gray-500 mt-2 sm:mt-0">
                Last 12 {period === 'daily' ? 'Days' : period === 'weekly' ? 'Weeks' : 'Months'}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="startDate"
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}${value > 10 ? '' : '%'}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cycleEfficiency"
                  stroke="#3b82f6"
                  name="Cycle Efficiency (%)"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="deliveryRatePerDay"
                  stroke="#10b981"
                  name="Delivery Rate (/day)"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="reworkRatio"
                  stroke="#ef4444"
                  name="Rework Ratio (%)"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">No metrics data found for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};