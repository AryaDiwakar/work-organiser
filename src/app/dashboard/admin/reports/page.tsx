"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getStatusLabel, getStatusColor, formatDate, formatDuration } from "@/lib/utils";
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
type ReportTab = "client" | "attendance" | "time" | "post" | "clientSummary" | "resourceSummary";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface AttReportDay {
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number | null;
  status: string;
}

interface AttReportSummaryRow {
  userId: string;
  name: string;
  email: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  permissionHours: number;
  leaveDates: string[];
  attendance: AttReportDay[];
}

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

  // Post status report state
  const [postStartDate, setPostStartDate] = useState("");
  const [postEndDate, setPostEndDate] = useState("");
  const [postClientFilter, setPostClientFilter] = useState("");
  const [postReport, setPostReport] = useState<any>(null);
  const [postLoading, setPostLoading] = useState(false);

  // Client summary report state
  const [csMonth, setCsMonth] = useState(String(now.getMonth() + 1));
  const [csYear, setCsYear] = useState(String(now.getFullYear()));
  const [clientSummary, setClientSummary] = useState<any>(null);
  const [clientSummaryLoading, setClientSummaryLoading] = useState(false);

  // Resource summary report state
  const [rsMonth, setRsMonth] = useState(String(now.getMonth() + 1));
  const [rsYear, setRsYear] = useState(String(now.getFullYear()));
  const [resourceSummary, setResourceSummary] = useState<any>(null);
  const [resourceSummaryLoading, setResourceSummaryLoading] = useState(false);

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
    const totalDays = attReport.totalDays || 0;
    const dayHeaders = Array.from({ length: totalDays }, (_, i) => String(i + 1).padStart(2, "0"));
    const matrixRows = (attReport.summary as AttReportSummaryRow[]).map((s) => {
      const attByDay = new Map<string, AttReportDay>();
      s.attendance.forEach((a) => attByDay.set(toDateKey(new Date(a.date)), a));
      const leaveDates = new Set(s.leaveDates || []);
      const row: Record<string, string> = { Resource: s.name };
      dayHeaders.forEach((day, i) => {
        const key = toDateKey(new Date(attReport.year, attReport.month - 1, i + 1));
        if (leaveDates.has(key)) {
          row[day] = "LEAVE";
        } else if (attByDay.has(key)) {
          const a = attByDay.get(key);
          row[day] = a ? `${hhmm(a.loginTime)}/${hhmm(a.logoutTime)}` : "";
        } else {
          row[day] = "";
        }
      });
      return row;
    });
    const ws1 = XLSX.utils.json_to_sheet(matrixRows, { header: ["Resource", ...dayHeaders] });
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

  async function generatePostReport() {
    if (!postStartDate || !postEndDate) return;
    setPostLoading(true);
    try {
      const params = new URLSearchParams({ startDate: postStartDate, endDate: postEndDate });
      if (postClientFilter) params.set("clientId", postClientFilter);
      const res = await fetch(`/api/reports/post-status?${params}`);
      const data = await res.json();
      setPostReport(data);
    } catch (error) {
      console.error("Failed to generate post status report:", error);
    } finally {
      setPostLoading(false);
    }
  }

  function applyPostMonthPreset(monthsAgo: number) {
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    setPostStartDate(startStr);
    setPostEndDate(endStr);
  }

  function downloadPostExcel() {
    if (!postReport) return;
    const rows = (postReport.posts || []).map((p: any) => ({
      "Title": p.title,
      "Client": p.client,
      "Category": p.category,
      "Platform": Array.isArray(p.platform) ? p.platform.join(", ") : (p.platform || "-"),
      "Posting Date": formatDate(p.postingDate),
      "Completion Date": p.completionDate ? formatDate(p.completionDate) : "-",
      "Status": getStatusLabel(p.status),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Posts");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `post_status_report_${postStartDate}_to_${postEndDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateClientSummary() {
    setClientSummaryLoading(true);
    try {
      const params = new URLSearchParams({ month: csMonth, year: csYear });
      const res = await fetch(`/api/reports/client-summary?${params}`);
      const data = await res.json();
      setClientSummary(data);
    } catch (error) {
      console.error("Failed to generate client summary:", error);
    } finally {
      setClientSummaryLoading(false);
    }
  }

  function downloadClientSummaryExcel() {
    if (!clientSummary) return;
    const rows = (clientSummary.clients || []).map((c: any) => ({
      "Client": c.clientName,
      "Total Posts": c.totalPosts,
      "Posted": c.posted,
      "Pending": c.pending,
      "Total Reach": c.totalReach,
      "Total Engagement": c.totalEngagement,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Summary");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_summary_${csMonth}_${csYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateResourceSummary() {
    setResourceSummaryLoading(true);
    try {
      const params = new URLSearchParams({ month: rsMonth, year: rsYear });
      const res = await fetch(`/api/reports/resource-summary?${params}`);
      const data = await res.json();
      setResourceSummary(data);
    } catch (error) {
      console.error("Failed to generate resource summary:", error);
    } finally {
      setResourceSummaryLoading(false);
    }
  }

  function downloadResourceSummaryExcel() {
    if (!resourceSummary) return;
    const rows = (resourceSummary.report || []).map((r: any) => ({
      "Resource": r.name,
      "Calendar Assigned": r.calendarAssigned,
      "Calendar Posted": r.calendarPosted,
      "Calendar Pending": r.calendarPending,
      "Adhoc Assigned": r.adhocAssigned,
      "Adhoc Completed": r.adhocCompleted,
      "Adhoc Pending": r.adhocPending,
      "Total Tasks": r.totalTasks,
      "Total Time": formatDuration(r.totalSeconds),
    }));
    const clientRows = (resourceSummary.report || []).flatMap((r: any) =>
      (r.byClient || []).map((c: any) => ({
        "Resource": r.name,
        "Client": c.clientName,
        "Calendar Assigned": c.calendarAssigned,
        "Calendar Posted": c.calendarPosted,
        "Calendar Pending": c.calendarPending,
        "Adhoc Assigned": c.adhocAssigned,
        "Adhoc Completed": c.adhocCompleted,
        "Adhoc Pending": c.adhocPending,
        "Total Tasks": c.totalTasks,
      }))
    );
    const ws1 = XLSX.utils.json_to_sheet(rows);
    const ws2 = XLSX.utils.json_to_sheet(clientRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Resource Summary");
    if (clientRows.length > 0) XLSX.utils.book_append_sheet(wb, ws2, "Per-client Breakdown");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource_summary_${rsMonth}_${rsYear}.xlsx`;
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
    { key: "post" as ReportTab, label: "Post Status Report", icon: FileText },
    { key: "clientSummary" as ReportTab, label: "Client-wise Summary", icon: Users },
    { key: "resourceSummary" as ReportTab, label: "Resource-wise Summary", icon: Users },
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
                report.totalPosts === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No data available for this period.</p>
                  </div>
                ) : (
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
                )
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

                  {attReport.summary?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Attendance Matrix</h2>
                        <span className="text-xs text-gray-400">Check-in / Check-out · LEAVE = approved leave · blank = absent</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-500">
                              <th className="px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-gray-50 z-10">Resource</th>
                              {Array.from({ length: attReport.totalDays || 0 }, (_, i) => (
                                <th key={i} className="px-2 py-3 font-medium text-center">{String(i + 1).padStart(2, "0")}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {attReport.summary.map((s: AttReportSummaryRow) => {
                              const attByDay = new Map<string, AttReportDay>();
                              s.attendance.forEach((a) => attByDay.set(toDateKey(new Date(a.date)), a));
                              const leaveDates = new Set(s.leaveDates || []);
                              return (
                                <tr key={s.userId} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">{s.name}</td>
                                  {Array.from({ length: attReport.totalDays || 0 }, (_, i) => {
                                    const key = toDateKey(new Date(attReport.year, attReport.month - 1, i + 1));
                                    let content: string;
                                    let cls = "text-gray-400";
                                    if (leaveDates.has(key)) {
                                      content = "LEAVE";
                                      cls = "text-amber-600 font-medium";
                                    } else if (attByDay.has(key)) {
                                      const a = attByDay.get(key);
                                      content = a ? `${hhmm(a.loginTime)}/${hhmm(a.logoutTime)}` : "";
                                      cls = "text-gray-900 font-mono whitespace-nowrap";
                                    } else {
                                      content = "";
                                    }
                                    return (
                                      <td key={i} className={`px-2 py-2 text-center ${cls}`}>{content}</td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Generate attendance report to view resource data.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "post" && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-44">
                  <Input label="Start Date" type="date" value={postStartDate} onChange={(e) => setPostStartDate(e.target.value)} />
                </div>
                <span className="text-gray-400 pb-2">to</span>
                <div className="w-44">
                  <Input label="End Date" type="date" value={postEndDate} onChange={(e) => setPostEndDate(e.target.value)} />
                </div>
                <div className="w-56">
                  <Select
                    label="Client"
                    options={[{ value: "", label: "All Clients" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
                    value={postClientFilter}
                    onChange={(e) => setPostClientFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Button variant="outline" size="sm" onClick={() => applyPostMonthPreset(0)}>
                    Current Month
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPostMonthPreset(1)}>
                    Last Month
                  </Button>
                </div>
                <Button onClick={generatePostReport} isLoading={postLoading}>Generate Report</Button>
                {postReport && (
                  <Button variant="outline" onClick={downloadPostExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {postReport ? (
                postReport.totalPosts === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No data available for this period.</p>
                  </div>
                ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{postReport.totalPosts || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Posted</p>
                      <p className="text-2xl font-bold text-green-600">{postReport.posted || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Scheduled</p>
                      <p className="text-2xl font-bold text-purple-600">{postReport.scheduled || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{postReport.pending || 0}</p>
                    </div>
                  </div>

                  {postReport.statusDistribution?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={postReport.statusDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="status" tickFormatter={(v) => getStatusLabel(v)} fontSize={11} />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, "Count"]} labelFormatter={(v) => getStatusLabel(v)} />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Post-wise Status</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Platform</th>
                            <th className="px-4 py-3 font-medium">Posting Date</th>
                            <th className="px-4 py-3 font-medium">Completion Date</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(postReport.posts || []).map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                              <td className="px-4 py-3 text-gray-600">{p.client}</td>
                              <td className="px-4 py-3 text-gray-600">{p.category}</td>
                              <td className="px-4 py-3 text-gray-600">{Array.isArray(p.platform) ? p.platform.join(", ") : (p.platform || "-")}</td>
                              <td className="px-4 py-3 text-gray-600">{formatDate(p.postingDate)}</td>
                              <td className="px-4 py-3 text-gray-600">{p.completionDate ? formatDate(p.completionDate) : "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                                  {getStatusLabel(p.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(postReport.posts || []).length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No posts found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                )
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Select a date range and generate report to view post status.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "clientSummary" && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-40">
                  <Select label="Month" options={monthOptions} value={csMonth} onChange={(e) => setCsMonth(e.target.value)} />
                </div>
                <div className="w-32">
                  <Select label="Year" options={yearOptions} value={csYear} onChange={(e) => setCsYear(e.target.value)} />
                </div>
                <Button onClick={generateClientSummary} isLoading={clientSummaryLoading}>Generate Report</Button>
                {clientSummary && (
                  <Button variant="outline" onClick={downloadClientSummaryExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {clientSummary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{clientSummary.totalClients || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Posts</p>
                      <p className="text-2xl font-bold text-indigo-600">{clientSummary.totalPosts || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Date(parseInt(csYear), parseInt(csMonth) - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Client-wise Summary</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Total Posts</th>
                            <th className="px-4 py-3 font-medium">Posted</th>
                            <th className="px-4 py-3 font-medium">Pending</th>
                            <th className="px-4 py-3 font-medium">Total Reach</th>
                            <th className="px-4 py-3 font-medium">Total Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(clientSummary.clients || []).map((c: any) => (
                            <tr key={c.clientId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{c.clientName}</td>
                              <td className="px-4 py-3 text-gray-600">{c.totalPosts}</td>
                              <td className="px-4 py-3">
                                <Badge variant="success">{c.posted}</Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{c.pending}</td>
                              <td className="px-4 py-3 text-gray-600">{c.totalReach || 0}</td>
                              <td className="px-4 py-3 text-gray-600">{c.totalEngagement || 0}</td>
                            </tr>
                          ))}
                          {(clientSummary.clients || []).length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No client data found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Generate a client-wise summary report.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "resourceSummary" && (
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-40">
                  <Select label="Month" options={monthOptions} value={rsMonth} onChange={(e) => setRsMonth(e.target.value)} />
                </div>
                <div className="w-32">
                  <Select label="Year" options={yearOptions} value={rsYear} onChange={(e) => setRsYear(e.target.value)} />
                </div>
                <Button onClick={generateResourceSummary} isLoading={resourceSummaryLoading}>Generate Report</Button>
                {resourceSummary && (
                  <Button variant="outline" onClick={downloadResourceSummaryExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {resourceSummary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Resources</p>
                      <p className="text-2xl font-bold text-gray-900">{resourceSummary.totalResources || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Tasks</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {(resourceSummary.report || []).reduce((s: number, r: any) => s + (r.totalTasks || 0), 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Date(parseInt(rsYear), parseInt(rsMonth) - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Resource-wise Summary</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-3 font-medium">Resource</th>
                            <th className="px-4 py-3 font-medium">Calendar Assigned</th>
                            <th className="px-4 py-3 font-medium">Calendar Posted</th>
                            <th className="px-4 py-3 font-medium">Calendar Pending</th>
                            <th className="px-4 py-3 font-medium">Adhoc Assigned</th>
                            <th className="px-4 py-3 font-medium">Adhoc Completed</th>
                            <th className="px-4 py-3 font-medium">Adhoc Pending</th>
                            <th className="px-4 py-3 font-medium">Total Tasks</th>
                            <th className="px-4 py-3 font-medium">Total Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(resourceSummary.report || []).map((r: any) => (
                            <tr key={r.userId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                              <td className="px-4 py-3 text-gray-600">{r.calendarAssigned}</td>
                              <td className="px-4 py-3">
                                <Badge variant="success">{r.calendarPosted}</Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{r.calendarPending}</td>
                              <td className="px-4 py-3 text-gray-600">{r.adhocAssigned}</td>
                              <td className="px-4 py-3 text-gray-600">{r.adhocCompleted}</td>
                              <td className="px-4 py-3 text-gray-600">{r.adhocPending}</td>
                              <td className="px-4 py-3 text-gray-600">{r.totalTasks}</td>
                              <td className="px-4 py-3 text-gray-900 font-mono">{formatDuration(r.totalSeconds)}</td>
                            </tr>
                          ))}
                          {(resourceSummary.report || []).length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No resource data found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Per-client Resource Breakdown</h2>
                    {(resourceSummary.report || []).filter((r: any) => (r.byClient || []).length > 0).length === 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
                        No client-wise task data found for this month.
                      </div>
                    )}
                    {(resourceSummary.report || []).filter((r: any) => (r.byClient || []).length > 0).map((r: any) => (
                      <div key={r.userId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                          <span className="text-xs text-gray-500">{r.byClient.length} clients &middot; {r.totalTasks} tasks</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500">
                                <th className="px-4 py-2 font-medium">Client</th>
                                <th className="px-4 py-2 font-medium">Calendar Assigned</th>
                                <th className="px-4 py-2 font-medium">Calendar Posted</th>
                                <th className="px-4 py-2 font-medium">Calendar Pending</th>
                                <th className="px-4 py-2 font-medium">Adhoc Assigned</th>
                                <th className="px-4 py-2 font-medium">Adhoc Completed</th>
                                <th className="px-4 py-2 font-medium">Adhoc Pending</th>
                                <th className="px-4 py-2 font-medium">Total Tasks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {r.byClient.map((c: any) => (
                                <tr key={c.clientId || c.clientName} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-medium text-gray-900">{c.clientName}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.calendarAssigned}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.calendarPosted}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.calendarPending}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.adhocAssigned}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.adhocCompleted}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.adhocPending}</td>
                                  <td className="px-4 py-2 text-gray-900">{c.totalTasks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Generate a resource-wise summary report.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}