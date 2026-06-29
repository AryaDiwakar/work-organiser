"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatDate, formatDateTime, getStatusLabel, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Calendar, ClipboardList, BarChart3 } from "lucide-react";

type Tab = "calendar" | "tasks" | "reports";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [client, setClient] = useState<any>(null);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  async function fetchAll() {
    setLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [clientRes, calendarRes, tasksRes, reportRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/calendar?clientId=${id}&month=${month}&year=${year}`),
        fetch(`/api/tasks?clientId=${id}`),
        fetch(`/api/reports?clientId=${id}&month=${month}&year=${year}`),
      ]);

      const clientData = await clientRes.json();
      const calendarData = await calendarRes.json();
      const tasksData = await tasksRes.json();
      const reportData = await reportRes.json();

      setClient(clientData);
      setCalendarEntries(Array.isArray(calendarData) ? calendarData : calendarData.data || []);
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData.data || []);
      setReport(reportData);
    } catch (error) {
      console.error("Failed to fetch client data:", error);
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

  if (!client) {
    return <p className="text-gray-400 text-center py-12">Client not found.</p>;
  }

  const statusCounts = calendarEntries.reduce((acc: Record<string, number>, entry: any) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});

  const resourceWorkload = calendarEntries.reduce((acc: Record<string, { name: string; count: number }>, entry: any) => {
    if (entry.assignedUser) {
      const uid = entry.assignedUser.id;
      if (!acc[uid]) acc[uid] = { name: entry.assignedUser.name, count: 0 };
      acc[uid].count++;
    }
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  const tabs = [
    { key: "calendar" as Tab, label: "Calendar", icon: Calendar },
    { key: "tasks" as Tab, label: "Adhoc Tasks", icon: ClipboardList },
    { key: "reports" as Tab, label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500 mt-1">
              {client.email && <span>{client.email} | </span>}
              {client.company && <span>{client.company}</span>}
              {client.phone && <span> | {client.phone}</span>}
            </p>
          </div>
          <Badge variant={client.isActive ? "success" : "danger"}>
            {client.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Posts (This Month)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{calendarEntries.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">By Status</p>
          <div className="mt-2 space-y-1">
            {Object.entries(statusCounts).length > 0 ? (
              Object.entries(statusCounts).slice(0, 4).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{getStatusLabel(status)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No entries</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Resource Workload</p>
          <div className="mt-2 space-y-1">
            {Object.values(resourceWorkload).length > 0 ? (
              Object.values(resourceWorkload).slice(0, 4).map((r) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{r.name}</span>
                  <span className="font-medium">{r.count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No assignments</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {activeTab === "calendar" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Posting Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calendarEntries.length > 0 ? (
                    calendarEntries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.title}</td>
                        <td className="px-4 py-3 text-gray-600">{entry.category?.name || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{entry.postType}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(entry.postingDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No calendar entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Assigned To</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tasks.length > 0 ? (
                    tasks.map((task: any) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                        <td className="px-4 py-3 text-gray-600">{task.assignedUser?.name || "Unassigned"}</td>
                        <td className="px-4 py-3 text-gray-600">{task.deadline ? formatDate(task.deadline) : "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            task.status === "COMPLETED" ? "success" :
                            task.status === "IN_PROGRESS" ? "info" :
                            task.status === "NEW" ? "warning" : "default"
                          }>
                            {task.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No adhoc tasks found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              {report ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Total Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{report.totalPosts || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Posted</p>
                      <p className="text-2xl font-bold text-green-600">{report.postedCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{report.pendingCount || 0}</p>
                    </div>
                  </div>

                  {report.statusDistribution && report.statusDistribution.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Status Breakdown</h3>
                      {report.statusDistribution.map((s: any) => (
                        <div key={s.status} className="flex items-center justify-between py-1 text-sm">
                          <span className="text-gray-600">{getStatusLabel(s.status)}</span>
                          <span className="font-medium">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No report data available for this month.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
