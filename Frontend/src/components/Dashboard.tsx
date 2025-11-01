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

  // Developer colors for consistent coloring
  const getDeveloperColor = (developerId: string) => {
    const colors = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
      "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6366F1"
    ];
    const index = parseInt(developerId, 10) % colors.length;
    return colors[index];
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

  // Transform data for Recharts - GROUP BY DATE
  const transformDataForChart = () => {
    const dates = Array.from(new Set(metrics.map(m => m.startDate)));

    return dates.map(date => {
      const dateData: any = { date };
      metrics.filter(m => m.startDate === date).forEach(metric => {
        const devName = metric.developerName || `Dev ${metric.developerId}`;
        dateData[devName] = metric[selectedMetric];
      });
      return dateData;
    });
  };

  const chartData = transformDataForChart();
  const developers = Array.from(new Set(metrics.map(m => m.developerName || `Dev ${m.developerId}`)));

  // Tooltip for chart - FIXED
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

        {/* --- CHART SECTION (TOP) - Perfect height to fit cards below --- */}
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

                {/* Line for each developer with proper data keys */}
                {developers.map((dev) => {
                  const color = getDeveloperColor(dev);
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
                      connectNulls
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