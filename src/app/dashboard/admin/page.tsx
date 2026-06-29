"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Users, Calendar, UserCheck, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444"];

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalCalendarEntries: 0,
    activeResources: 0,
    overdueTasks: 0,
  });
  const [statusDistribution, setStatusDistribution] = useState<{ status: string; count: number }[]>([]);
  const [slaDistribution, setSLADistribution] = useState<{ name: string; value: number }[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [clientsRes, calendarRes, usersRes, tasksRes] = await Promise.all([
        fetch("/api/clients"),
        fetch(`/api/calendar?month=${month}&year=${year}&limit=100`),
        fetch("/api/users"),
        fetch("/api/tasks"),
      ]);

      const clients = await clientsRes.json();
      const calendar = await calendarRes.json();
      const users = await usersRes.json();
      const tasks = await tasksRes.json();

      const clientsData = Array.isArray(clients) ? clients : clients.data || [];
      const calendarData = Array.isArray(calendar) ? calendar : calendar.data || [];
      const usersData = Array.isArray(users) ? users : users.data || [];
      const tasksData = Array.isArray(tasks) ? tasks : tasks.data || [];

      const activeResources = usersData.filter((u: any) => u.isActive && (u.role === "RESOURCE")).length;

      const statusCounts: Record<string, number> = {};
      calendarData.forEach((entry: any) => {
        statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
      });
      const dist = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      const slaStatuses = calendarData.map((entry: any) => getSLAStatus(entry));
      const onTrack = slaStatuses.filter((s: { status: string }) => s.status === "on_track").length;
      const warning = slaStatuses.filter((s: { color: string }) => s.color === "🟡").length;
      const overdue = slaStatuses.filter((s: { color: string }) => s.color === "🔴").length;
      const slaDist = [
        { name: "On Track", value: onTrack },
        { name: "Warning", value: warning },
        { name: "Overdue", value: overdue },
      ].filter((d) => d.value > 0);

      const overdueTasks = tasksData.filter((t: any) => {
        if (t.status === "COMPLETED" || t.status === "NOT_APPLICABLE") return false;
        return t.deadline && new Date(t.deadline) < now;
      }).length;

      const recent = calendarData.slice(0, 5);

      setStats({
        totalClients: clientsData.length,
        totalCalendarEntries: calendarData.length,
        activeResources,
        overdueTasks,
      });
      setStatusDistribution(dist);
      setSLADistribution(slaDist);
      setRecentEntries(recent);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "bg-blue-500" },
    { label: "Calendar Entries (This Month)", value: stats.totalCalendarEntries, icon: Calendar, color: "bg-indigo-500" },
    { label: "Active Resources", value: stats.activeResources, icon: UserCheck, color: "bg-green-500" },
    { label: "Overdue Tasks", value: stats.overdueTasks, icon: AlertTriangle, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || "Admin"}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your projects today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts by Status (This Month)</h2>
          {statusDistribution.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tickFormatter={(v) => getStatusLabel(v)} fontSize={11} />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, "Count"]} labelFormatter={(v) => getStatusLabel(v)} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No entries for this month.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SLA Status Distribution</h2>
          {slaDistribution.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slaDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {slaDistribution.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No data to display.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calendar Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Posting Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEntries.length > 0 ? (
                recentEntries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{entry.title}</td>
                    <td className="px-5 py-3 text-gray-600">{entry.client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(entry.postingDate)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No calendar entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
