"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getStatusLabel, formatDate, formatTime, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FileText, Users, BarChart3, Download, Clock } from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899"];
type ReportTab = "client" | "attendance" | "time";

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReportTab>("client");

  // Client report state
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Attendance report state
  const [attMonth, setAttMonth] = useState(String(now.getMonth() + 1));
  const [attYear, setAttYear] = useState(String(now.getFullYear()));
  const [attReport, setAttReport] = useState<any>(null);
  const [attLoading, setAttLoading] = useState(false);

  // Time report state
  const [timeStartDate, setTimeStartDate] = useState("");
  const [timeEndDate, setTimeEndDate] = useState("");
  const [timeUserFilter, setTimeUserFilter] = useState("");
  const [timeTaskTypeFilter, setTimeTaskTypeFilter] = useState("ALL");
  const [timeReport, setTimeReport] = useState<any>(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const usersData = Array.isArray(data) ? data : data.data || [];
      setUsers(usersData.filter((u: any) => u.isActive));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }

  async function generateClientReport() {
    if (!clientId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId, month, year });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateAttendanceReport() {
    setAttLoading(true);
    try {
      const params = new URLSearchParams({ month: attMonth, year: attYear });
      const res = await fetch(`/api/attendance/summary?${params}`);
      const data = await res.json();
      setAttReport(data);
    } catch (error) {
      console.error("Failed to generate attendance report:", error);
    } finally {
      setAttLoading(false);
    }
  }

  function downloadClientExcel() {
    if (!report) return;
    const statusRows = (report.statusDistribution || []).map((s: any) => ({
      "Status": getStatusLabel(s.status),
      "Count": s.count,
    }));
    const platformRows = (report.platformBreakdown || []).map((p: any) => ({
      "Platform": p.platform,
      "Count": p.count,
    }));
    const categoryRows = (report.categoryPerformance || []).map((c: any) => ({
      "Category": c.categoryName,
      "Posts": c.count,
    }));
    const ws1 = XLSX.utils.json_to_sheet(statusRows);
    const ws2 = XLSX.utils.json_to_sheet(platformRows);
    const ws3 = XLSX.utils.json_to_sheet(categoryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Status");
    XLSX.utils.book_append_sheet(wb, ws2, "Platform");
    XLSX.utils.book_append_sheet(wb, ws3, "Category");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_report_${clientId}_${month}_${year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAttendanceExcel() {
    if (!attReport) return;
    const summaryRows = (attReport.summary || []).map((s: any) => ({
      "Resource": s.name,
      "Present": s.presentDays,
      "Absent": s.absentDays,
      "Leaves": s.leaveDays,
      "Total Hours": s.totalHours,
      "Permission Hours": s.permissionHours,
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Attendance");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${attMonth}_${attYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateTimeReport() {
    if (!timeStartDate || !timeEndDate) return;
    setTimeLoading(true);
    try {
      const params = new URLSearchParams({ startDate: timeStartDate, endDate: timeEndDate });
      if (timeUserFilter) params.set("userId", timeUserFilter);
      if (timeTaskTypeFilter !== "ALL") params.set("taskType", timeTaskTypeFilter);
      const res = await fetch(`/api/reports/time?${params}`);
      const data = await res.json();
      setTimeReport(data);
    } catch (error) {
      console.error("Failed to generate time report:", error);
    } finally {
      setTimeLoading(false);
    }
  }

  function downloadTimeExcel() {
    if (!timeReport) return;
    const summaryRows = (timeReport.byUser || []).map((u: any) => ({
      "Resource": u.name,
      "Calendar Sessions": u.taskTypes?.CALENDAR || 0,
      "Adhoc Sessions": u.taskTypes?.ADHOC || 0,
      "Total Sessions": u.sessions,
      "Total Time": formatDuration(u.seconds),
    }));
    const dateRows = (timeReport.byDate || []).map((d: any) => ({
      "Date": d.date,
      "Calendar Entries": d.calendarCount,
      "Adhoc Entries": d.adhocCount,
      "Total Sessions": d.sessions,
      "Total Time": formatDuration(d.seconds),
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const ws2 = XLSX.utils.json_to_sheet(dateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "By Resource");
    XLSX.utils.book_append_sheet(wb, ws2, "By Date");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time_report_${timeStartDate}_to_${timeEndDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1), label: new Date(2024, i).toLocaleString("default", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  const tabs = [
    { key: "client" as ReportTab, label: "Client Work Report", icon: BarChart3 },
    { key: "time" as ReportTab, label: "Time Report", icon: Clock },
    ...(isSuperAdmin ? [{ key: "attendance" as ReportTab, label: "Attendance Report", icon: Users }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Generate client-wise and resource-wise reports</p>
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
          {activeTab === "client" && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-64">
                  <Select label="Client" options={clients.map((c) => ({ value: c.id, label: c.name }))} value={clientId} onChange={(e) => setClientId(e.target.value)} />
                </div>
                <div className="w-40">
                  <Select label="Month" options={monthOptions} value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                <div className="w-32">
                  <Select label="Year" options={yearOptions} value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <Button onClick={generateClientReport} isLoading={loading}>Generate Report</Button>
                {report && (
                  <Button variant="outline" onClick={downloadClientExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {report ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{report.totalPosts || 0}</p>
                    </div>
                    {report.statusDistribution?.filter((s: any) => s.status === "POSTED").map((s: any) => (
                      <div key="posted" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                        <p className="text-sm text-gray-500">Posted</p>
                        <p className="text-2xl font-bold text-green-600">{s.count || 0}</p>
                      </div>
                    ))}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {(report.totalPosts || 0) - (report.statusDistribution?.find((s: any) => s.status === "POSTED")?.count || 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Engagement</p>
                      <p className="text-2xl font-bold text-indigo-600">{report.engagement?.reach || 0}</p>
                      <p className="text-xs text-gray-400">Total Reach</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
                      {report.statusDistribution?.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={report.statusDistribution}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="status" tickFormatter={(v) => getStatusLabel(v)} fontSize={11} />
                              <YAxis />
                              <Tooltip formatter={(value) => [value, "Count"]} labelFormatter={(v) => getStatusLabel(v)} />
                              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-gray-400 text-center py-12">No data available.</p>}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h2>
                      {report.platformBreakdown?.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={report.platformBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="platform" label>
                                {report.platformBreakdown.map((_: any, i: number) => (
                                  <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-gray-400 text-center py-12">No data available.</p>}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Category-wise Performance</h2>
                    {report.categoryPerformance?.length > 0 ? (
                      <div className="space-y-3">
                        {report.categoryPerformance.map((cat: any) => {
                          const maxCount = Math.max(...report.categoryPerformance.map((c: any) => c.count));
                          return (
                            <div key={cat.categoryId} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{cat.categoryName}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">{cat.count} posts</span>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, (cat.count / maxCount) * 100)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-gray-400 text-center py-8">No category data available.</p>}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Select a client and generate report to view data.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "time" && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-44">
                  <Input label="Start Date" type="date" value={timeStartDate} onChange={(e) => setTimeStartDate(e.target.value)} />
                </div>
                <span className="text-gray-400 pb-2">to</span>
                <div className="w-44">
                  <Input label="End Date" type="date" value={timeEndDate} onChange={(e) => setTimeEndDate(e.target.value)} />
                </div>
                <div className="w-56">
                  <Select
                    label="Resource"
                    options={[{ value: "", label: "All Resources" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                    value={timeUserFilter}
                    onChange={(e) => setTimeUserFilter(e.target.value)}
                  />
                </div>
                <div className="w-44">
                  <Select
                    label="Task Type"
                    options={[
                      { value: "ALL", label: "All Types" },
                      { value: "CALENDAR", label: "Calendar" },
                      { value: "ADHOC", label: "Adhoc" },
                    ]}
                    value={timeTaskTypeFilter}
                    onChange={(e) => setTimeTaskTypeFilter(e.target.value)}
                  />
                </div>
                <Button onClick={generateTimeReport} isLoading={timeLoading}>Generate Report</Button>
                {timeReport && (
                  <Button variant="outline" onClick={downloadTimeExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {timeReport ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="text-2xl font-bold text-indigo-600">{formatDuration(timeReport.summary?.totalSeconds || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{timeReport.summary?.totalSessions || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Unique Tasks</p>
                      <p className="text-2xl font-bold text-gray-900">{timeReport.summary?.uniqueTasks || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Avg Session</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(timeReport.summary?.avgSessionSeconds || 0)}</p>
                    </div>
                  </div>

                  {timeReport.byDate?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Date-wise Breakdown</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-500">
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Calendar Sessions</th>
                              <th className="px-4 py-3 font-medium">Adhoc Sessions</th>
                              <th className="px-4 py-3 font-medium">Total Sessions</th>
                              <th className="px-4 py-3 font-medium">Total Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {timeReport.byDate.map((d: any) => (
                              <tr key={d.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{formatDate(d.date)}</td>
                                <td className="px-4 py-3 text-gray-600">{d.calendarCount}</td>
                                <td className="px-4 py-3 text-gray-600">{d.adhocCount}</td>
                                <td className="px-4 py-3 text-gray-600">{d.sessions}</td>
                                <td className="px-4 py-3 text-gray-900 font-mono">{formatDuration(d.seconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {timeReport.byUser?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Resource-wise Summary</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-500">
                              <th className="px-4 py-3 font-medium">Resource</th>
                              <th className="px-4 py-3 font-medium">Calendar Sessions</th>
                              <th className="px-4 py-3 font-medium">Adhoc Sessions</th>
                              <th className="px-4 py-3 font-medium">Total Sessions</th>
                              <th className="px-4 py-3 font-medium">Total Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {timeReport.byUser.map((u: any) => (
                              <tr key={u.userId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                                <td className="px-4 py-3 text-gray-600">{u.taskTypes?.CALENDAR || 0}</td>
                                <td className="px-4 py-3 text-gray-600">{u.taskTypes?.ADHOC || 0}</td>
                                <td className="px-4 py-3 text-gray-600">{u.sessions}</td>
                                <td className="px-4 py-3 text-gray-900 font-mono">{formatDuration(u.seconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Select a date range and generate report to view time data.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "attendance" && isSuperAdmin && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-40">
                  <Select label="Month" options={monthOptions} value={attMonth} onChange={(e) => setAttMonth(e.target.value)} />
                </div>
                <div className="w-32">
                  <Select label="Year" options={yearOptions} value={attYear} onChange={(e) => setAttYear(e.target.value)} />
                </div>
                <Button onClick={generateAttendanceReport} isLoading={attLoading}>Generate Report</Button>
                {attReport && (
                  <Button variant="outline" onClick={downloadAttendanceExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {attReport ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Resources</p>
                      <p className="text-2xl font-bold text-gray-900">{attReport.summary?.length || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Working Days</p>
                      <p className="text-2xl font-bold text-gray-900">{attReport.totalDays || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Month</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {new Date(parseInt(attYear), parseInt(attMonth) - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Resource-wise Attendance</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-3 font-medium">Resource</th>
                            <th className="px-4 py-3 font-medium">Present</th>
                            <th className="px-4 py-3 font-medium">Absent</th>
                            <th className="px-4 py-3 font-medium">Leaves</th>
                            <th className="px-4 py-3 font-medium">Total Hours</th>
                            <th className="px-4 py-3 font-medium">Permission Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {attReport.summary?.map((s: any) => (
                            <tr key={s.userId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                              <td className="px-4 py-3">
                                <Badge variant="success">{s.presentDays}</Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{s.absentDays}</td>
                              <td className="px-4 py-3 text-gray-600">{s.leaveDays}</td>
                              <td className="px-4 py-3 text-gray-600">{s.totalHours}h</td>
                              <td className="px-4 py-3 text-gray-600">{s.permissionHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {attReport.summary?.map((s: any) => s.attendance?.length > 0 && (
                    <div key={s.userId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">{s.name} - Daily Log</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-500">
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Login</th>
                              <th className="px-4 py-3 font-medium">Logout</th>
                              <th className="px-4 py-3 font-medium">Hours</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {s.attendance.map((a: any) => (
                              <tr key={a.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900">{formatDate(a.date)}</td>
                                <td className="px-4 py-3 text-gray-600">{formatTime(a.loginTime)}</td>
                                <td className="px-4 py-3 text-gray-600">{formatTime(a.logoutTime)}</td>
                                <td className="px-4 py-3 text-gray-600">{a.hoursWorked ? `${a.hoursWorked}h` : "-"}</td>
                                <td className="px-4 py-3">
                                  <Badge variant={a.status === "present" ? "success" : "danger"}>{a.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Generate attendance report to view resource data.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}