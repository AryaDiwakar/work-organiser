"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDateTime, formatDuration, formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Play, Pause, Square, Clock, Calendar, ClipboardList } from "lucide-react";

export default function ResourceActivityPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    if (userId) fetchActivity();
  }, [userId, startDate, endDate]);

  async function fetchActivity() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/time-tracker/user/${userId}?${params}`);
      const data = await res.json();
      setUser(data.user);
      setEntries(data.entries || []);
      setAttendance(data.attendance || []);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const calEntries = entries.filter((e) => e.taskType === "CALENDAR");
  const adhocEntries = entries.filter((e) => e.taskType === "ADHOC");

  const calGrouped = Object.entries(
    calEntries.reduce<Record<string, { title: string; clientName: string; seconds: number; count: number }>>((acc, e) => {
      const key = e.taskId;
      if (!acc[key]) acc[key] = { title: e.task?.title || "Unknown", clientName: e.task?.clientName || "-", seconds: 0, count: 0 };
      acc[key].seconds += e.duration || 0;
      acc[key].count++;
      return acc;
    }, {})
  );

  const adhocGrouped = Object.entries(
    adhocEntries.reduce<Record<string, { title: string; clientName: string; seconds: number; count: number }>>((acc, e) => {
      const key = e.taskId;
      if (!acc[key]) acc[key] = { title: e.task?.title || "Unknown", clientName: e.task?.clientName || "-", seconds: 0, count: 0 };
      acc[key].seconds += e.duration || 0;
      acc[key].count++;
      return acc;
    }, {})
  );

  function getStatusIcon(entry: any) {
    if (!entry.endTime) return <Play className="h-3 w-3 text-green-500" />;
    return <Square className="h-3 w-3 text-red-400" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/resources">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || "Resource Activity"}</h1>
          <p className="text-gray-500 mt-1">{user?.email} &middot; <Badge variant="info">{user?.role?.replace(/_/g, " ")}</Badge></p>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-44">
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button onClick={fetchActivity} isLoading={loading}>Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Time Tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(totalSeconds)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Calendar Tasks</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{calGrouped.length} tasks</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Adhoc Tasks</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{adhocGrouped.length} tasks</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Days Present</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{attendance.filter((a) => a.status === "present").length} / {attendance.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No timer activity found for this period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {calGrouped.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Calendar Tasks</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Sessions</th>
                      <th className="px-4 py-3 font-medium">Total Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calGrouped.map(([taskId, g]) => (
                      <tr key={taskId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{g.title}</td>
                        <td className="px-4 py-3 text-gray-600">{g.clientName}</td>
                        <td className="px-4 py-3 text-gray-600">{g.count}</td>
                        <td className="px-4 py-3 font-mono text-sm">{formatDuration(g.seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adhocGrouped.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-gray-900">Adhoc Tasks</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Sessions</th>
                      <th className="px-4 py-3 font-medium">Total Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adhocGrouped.map(([taskId, g]) => (
                      <tr key={taskId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{g.title}</td>
                        <td className="px-4 py-3 text-gray-600">{g.clientName}</td>
                        <td className="px-4 py-3 text-gray-600">{g.count}</td>
                        <td className="px-4 py-3 font-mono text-sm">{formatDuration(g.seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {attendance.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Check In / Check Out</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Check In</th>
                      <th className="px-4 py-3 font-medium">Check Out</th>
                      <th className="px-4 py-3 font-medium">Hours</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{formatDate(a.date)}</td>
                        <td className="px-4 py-3 text-gray-600">{a.loginTime ? formatTime(a.loginTime) : "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{a.logoutTime ? formatTime(a.logoutTime) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-sm">{a.hoursWorked ? `${a.hoursWorked.toFixed(1)}h` : "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={a.status === "present" ? "success" : a.status === "leave" ? "warning" : "danger"}>
                            {a.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Activity Timeline</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 text-xs">{formatDateTime(entry.startTime)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.taskType === "CALENDAR" ? "info" : "warning"}>
                          {entry.taskType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.task?.title || "Unknown"}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.task?.clientName || "-"}</td>
                      <td className="px-4 py-3 font-mono text-sm">{formatDuration(entry.duration)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(entry)}
                          <span className="text-xs text-gray-500">
                            {entry.endTime ? "Stopped" : "Running"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
