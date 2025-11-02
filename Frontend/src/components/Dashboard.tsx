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
  developerId: string;
  developerName: string;
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
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedMetric, setSelectedMetric] = useState<
    "cycleEfficiency" | "deliveryRatePerDay" | "reworkRatio"
  >("cycleEfficiency");
  const [loading, setLoading] = useState(true);

  // Color schemes for different metrics
  const metricColors = {
    cycleEfficiency: {
      primary: "#3B82F6",
      light: "#EFF6FF",
      border: "border-blue-200"
    },
    deliveryRatePerDay: {
      primary: "#10B981",
      light: "#ECFDF5",
      border: "border-emerald-200"
    },
    reworkRatio: {
      primary: "#F59E0B",
      light: "#FFFBEB",
      border: "border-amber-200"
    }
  };

  // Fixed color functions
const getDeveloperColor = (developerId: string, index: number) => {
  const baseColors = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Violet
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#EC4899", // Pink
    "#6366F1"  // Indigo
  ];
  
  // Ensure we have a valid developerId or use index as fallback
  const baseColorIndex = developerId && !isNaN(parseInt(developerId)) ? 
    Math.abs(parseInt(developerId, 10)) % baseColors.length : 
    Math.abs(index) % baseColors.length;
  
  const baseColor = baseColors[baseColorIndex] || baseColors[0]; // Fallback to first color
  
  // Generate gradient variations for multiple developers
  if (index > 0) {
    return adjustColorShade(baseColor, index * 8); // 8% shade variation per developer
  }
  
  return baseColor;
};

// Safe color adjustment function
const adjustColorShade = (color: string, percent: number): string => {
  // Handle undefined or invalid colors
  if (!color || typeof color !== 'string') {
    return "#3B82F6"; // Default blue
  }
  
  // Ensure color is in correct format
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Validate hex color
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return "#3B82F6"; // Default blue for invalid colors
  }
  
  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  
  const R = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0xFF) + amt));
  
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1).toUpperCase()}`;
};

  // Fetch metrics for all developers
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/metrics/all?period=${period}`);
      setMetrics(res.data.records || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const latest = metrics.length ? metrics[metrics.length - 1] : null;

  // Format date
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // Transform data for Recharts - ENSURING ALL DEVELOPERS START AT SAME POINT
  const transformDataForChart = () => {
    const dates = Array.from(new Set(metrics.map(m => m.startDate))).sort();
    const allDevelopers = Array.from(
      new Set(metrics.map(m => m.developerName || `Dev ${m.developerId}`))
    );

    // Find the earliest date where we have data for all developers
    const findCommonStartDate = () => {
      const developerFirstDates = new Map();
      
      allDevelopers.forEach(dev => {
        const devMetrics = metrics.filter(m => 
          (m.developerName || `Dev ${m.developerId}`) === dev
        );
        if (devMetrics.length > 0) {
          const firstDate = devMetrics.reduce((earliest, current) => 
            current.startDate < earliest ? current.startDate : earliest, 
            devMetrics[0].startDate
          );
          developerFirstDates.set(dev, firstDate);
        }
      });

      // Return the latest of all first dates (ensuring all have data from this point)
      const firstDates = Array.from(developerFirstDates.values());
      return firstDates.length > 0 ? 
        firstDates.reduce((latest, current) => current > latest ? current : latest) : 
        dates[0];
    };

    const commonStartDate = findCommonStartDate();
    const startIndex = dates.indexOf(commonStartDate);
    const filteredDates = startIndex >= 0 ? dates.slice(startIndex) : dates;

    return filteredDates.map(date => {
      const dateData: any = { date };
      
      // Initialize all developers with null for this date
      allDevelopers.forEach(dev => {
        dateData[dev] = null;
      });
      
      // Fill in actual data where available
      metrics
        .filter(m => m.startDate === date)
        .forEach(metric => {
          const devName = metric.developerName || `Dev ${metric.developerId}`;
          dateData[devName] = metric[selectedMetric];
        });
      
      return dateData;
    });
  };

  const chartData = transformDataForChart();
  const developers = Array.from(
    new Set(metrics.map(m => m.developerName || `Dev ${m.developerId}`))
  );

  // Tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >{`${entry.name}: ${entry.value}${
              selectedMetric === "cycleEfficiency" || selectedMetric === "reworkRatio"
                ? "%"
                : ""
            }`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* --- CHART SECTION (TOP) --- */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          {metrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b7280" }}
                  tickFormatter={formatDate}
                />
                <YAxis tick={{ fill: "#6b7280" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Line for each developer with gradient colors and proper start */}
                {developers.map((dev, index) => {
                  // Find the original metric to get developerId for consistent coloring
                  const devMetric = metrics.find(m => 
                    (m.developerName || `Dev ${m.developerId}`) === dev
                  );
                  const color = getDeveloperColor(devMetric?.developerId || dev, index);
                  return (
                    <Line
                      key={dev}
                      type="monotone"
                      dataKey={dev}
                      name={dev}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ fill: color, r: 4 }}
                      activeDot={{ r: 6, fill: color }}
                      connectNulls={false} // Don't connect lines across null values
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No data available for the selected period.
            </div>
          )}
        </div>

        {/* --- METRIC CARDS (BOTTOM) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              key: "cycleEfficiency",
              label: "Cycle Efficiency",
              sub: "Tasks Completed",
              value: latest?.cycleEfficiency ? `${latest.cycleEfficiency}%` : "--",
              subValue: latest?.completedTaskCount || 0,
            },
            {
              key: "deliveryRatePerDay",
              label: "Delivery Rate",
              sub: "Tasks Completed",
              value: latest?.deliveryRatePerDay
                ? `${latest.deliveryRatePerDay}/day`
                : "--",
              subValue: latest?.completedCount || 0,
            },
            {
              key: "reworkRatio",
              label: "Rework Ratio",
              sub: "Reopened Tasks",
              value: latest?.reworkRatio ? `${latest.reworkRatio}%` : "--",
              subValue: latest?.totalReopened || 0,
            },
          ].map((metric) => {
            const colors = metricColors[metric.key as keyof typeof metricColors];

            return (
              <div
                key={metric.key}
                className={`rounded-lg shadow p-4 text-center border ${
                  selectedMetric === metric.key ? `${colors.border} border-2` : "border-transparent"
                }`}
                style={{ backgroundColor: colors.light }}
              >
                <p className="font-semibold mb-1" style={{ color: colors.primary }}>
                  {metric.label}: {metric.value}
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  {metric.subValue} {metric.sub}
                </p>

                {/* Period buttons */}
                <div className="flex justify-center gap-2">
                  {["daily", "weekly", "monthly"].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPeriod(p as any);
                        setSelectedMetric(metric.key as any);
                      }}
                      className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${
                        period === p && selectedMetric === metric.key
                          ? "text-white"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                      style={{
                        backgroundColor: period === p && selectedMetric === metric.key ? colors.primary : undefined,
                        borderColor: period === p && selectedMetric === metric.key ? colors.primary : undefined,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};