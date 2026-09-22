"use client";
import { useState, useEffect } from "react";
import { formatDate, formatTime, formatDuration, getStatusLabel, getStatusColor, getAdhocStatusColor, getAdhocStatusLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import * as XLSX from "xlsx";
import { Users, CheckCircle, CalendarOff, UserX, Download } from "lucide-react";

interface EmployeeReport {
  userId: string;
  name: string;
  email: string;
  status: "present" | "leave" | "absent";
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number | null;
  calendarCount: number;
  adhocCount: number;
  totalTasks: number;
  calendarTasks: { id: string; title: string; client: string; status: string; postingDate: string }[];
  adhocTasks: { id: string; title: string; client: string; status: string; deadline: string | null }[];
}

function todayIST(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset).toISOString().split("T")[0];
}

export default function DailyReportPage() {
  const [date, setDate] = useState(todayIST());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    generateReport();
  }, [date]);

  async function generateReport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/daily-employees?date=${date}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to load report");
        return;
      }
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function downloadExcel() {
    if (!report) return;
    const rows = (report.report || []).map((r: EmployeeReport) => ({
      "Employee": r.name,
      "Status": r.status,
      "Check-in": r.loginTime ? formatTime(r.loginTime) : "-",
      "Check-out": r.logoutTime ? formatTime(r.logoutTime) : "-",
      "Hours": r.hoursWorked != null ? `${r.hoursWorked}h` : "-",
      "Calendar Tasks": r.calendarCount,
      "Adhoc Tasks": r.adhocCount,
      "Total Tasks": r.totalTasks,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_report_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    { label: "Total Workers", value: report?.totalWorkers || 0, icon: Users, color: "bg-indigo-500" },
    { label: "Present", value: report?.present || 0, icon: CheckCircle, color: "bg-green-500" },
    { label: "On Leave", value: report?.leave || 0, icon: CalendarOff, color: "bg-amber-500" },
    { label: "Absent", value: report?.absent || 0, icon: UserX, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Work Report</h1>
          <p className="text-gray-500 mt-1">Per-employee daily report</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="w-44">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="outline" onClick={downloadExcel} disabled={!report}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

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

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (report?.report || []).length > 0 ? (
        <div className="space-y-6">
          {report.report.map((r: EmployeeReport) => (
            <div key={r.userId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{r.name}</h2>
                    <Badge variant={r.status === "present" ? "success" : r.status === "leave" ? "warning" : "danger"}>
                      {r.status === "present" ? "Present" : r.status === "leave" ? "On Leave" : "Absent"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Check-in {r.loginTime ? formatTime(r.loginTime) : "-"} &middot; Check-out {r.logoutTime ? formatTime(r.logoutTime) : "-"} &middot; {r.hoursWorked != null ? `${r.hoursWorked}h worked` : "No hours"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{r.totalTasks}</p>
                </div>
              </div>

              {r.totalTasks > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">Task</th>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {r.calendarTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                          <td className="px-4 py-3 text-gray-600">{t.client}</td>
                          <td className="px-4 py-3">
                            <Badge variant="info">Calendar</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(t.postingDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status)}`}>
                              {getStatusLabel(t.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {r.adhocTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                          <td className="px-4 py-3 text-gray-600">{t.client}</td>
                          <td className="px-4 py-3">
                            <Badge>Adhoc</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{t.deadline ? formatDate(t.deadline) : "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdhocStatusColor(t.status)}`}>
                              {getAdhocStatusLabel(t.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6 text-sm">No tasks recorded.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No report data available for {formatDate(date)}.</p>
        </div>
      )}
    </div>
  );
}