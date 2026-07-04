"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus, isAdminRole, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Calendar, Clock, CheckCircle, AlertTriangle, BarChart3, ClipboardList, Trash2, Play, Pause, Square } from "lucide-react";

const PLATFORMS = ["Linkedin", "Facebook", "Instagram", "Youtube", "Google", "Twitter"];

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  postingDate: string;
  status: string;
  assignedUser: { id: string; name: string } | null;
}

interface AdhocTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  client: { id: string; name: string } | null;
}

export default function ResourceDashboardPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const isAdminUser = isAdminRole(role);
  const [tasks, setTasks] = useState<CalendarEntry[]>([]);
  const [adhocTasks, setAdhocTasks] = useState<AdhocTask[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reachModalOpen, setReachModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [reachForm, setReachForm] = useState<Record<string, string>>({});
  const [savingReach, setSavingReach] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ taskType: string; taskId: string; startTime: string } | null>(null);
  const [timerTotals, setTimerTotals] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (userId) fetchActiveTimer();
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((tasks.length || adhocTasks.length) && userId) {
      fetchAllTimerTotals();
    }
  }, [tasks.length, adhocTasks.length, userId]);

  async function fetchActiveTimer() {
    try {
      const res = await fetch("/api/time-tracker");
      const data = await res.json();
      if (data?.active) {
        setActiveTimer({ taskType: data.active.taskType, taskId: data.active.taskId, startTime: data.active.startTime });
      } else {
        setActiveTimer(null);
      }
    } catch (error) {
      console.error("Failed to fetch active timer:", error);
    }
  }

  async function fetchAllTimerTotals() {
    try {
      const allIds = [
        ...tasks.map((t) => ({ taskType: "CALENDAR" as const, taskId: t.id })),
        ...adhocTasks.map((t) => ({ taskType: "ADHOC" as const, taskId: t.id })),
      ];
      if (!allIds.length) return;
      const results = await Promise.all(
        allIds.map(async ({ taskType, taskId }) => {
          const res = await fetch(`/api/time-tracker?taskType=${taskType}&taskId=${taskId}`);
          const data = await res.json();
          const entries: any[] = Array.isArray(data) ? data : [];
          let completed = 0;
          for (const e of entries) {
            if (e.endTime) {
              completed += Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000);
            }
          }
          return { key: `${taskType}_${taskId}`, completed };
        })
      );
      setTimerTotals(Object.fromEntries(results.map((r) => [r.key, r.completed])));
    } catch (error) {
      console.error("Failed to fetch timer totals:", error);
    }
  }

  async function fetchTasks() {
    setLoading(true);
    try {
      const now = new Date();
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);

      const params = new URLSearchParams({ assignedTo: userId });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const adhocParams = new URLSearchParams({ assignedTo: userId });
      if (startDate) adhocParams.set("startDate", startDate);
      if (endDate) adhocParams.set("endDate", endDate);

      const [calRes, adhocRes] = await Promise.all([
        fetch(`/api/calendar?${params}`),
        fetch(`/api/tasks?${adhocParams}`),
      ]);
      const calData = await calRes.json();
      const adhocData = await adhocRes.json();
      const allTasks: CalendarEntry[] = Array.isArray(calData) ? calData : calData.data || [];

      setTasks(allTasks);
      setAdhocTasks(Array.isArray(adhocData) ? adhocData : adhocData.data || []);
      setUpcoming(
        allTasks.filter((t) => {
          const d = new Date(t.postingDate);
          return d >= now && d <= weekLater;
        })
      );
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkComplete(entryId: string) {
    setCompleting(entryId);
    try {
      const res = await fetch(`/api/calendar/${entryId}/complete`, { method: "POST" });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to mark complete:", error);
    } finally {
      setCompleting(null);
    }
  }

  async function openReachModal(entry: CalendarEntry) {
    setSelectedEntry(entry);
    setReachForm({});
    setReachModalOpen(true);
    try {
      const res = await fetch(`/api/performance?calendarEntryId=${entry.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.id) {
        setReachForm({
          Linkedin: String(data.linkedinReach ?? ""),
          Facebook: String(data.facebookReach ?? ""),
          Instagram: String(data.instagramReach ?? ""),
          Youtube: String(data.youtubeReach ?? ""),
          Google: String(data.googleReach ?? ""),
          Twitter: String(data.twitterReach ?? ""),
        });
      }
    } catch (error) {
      console.error("Failed to fetch reach:", error);
    }
  }

  async function handleSaveReach() {
    if (!selectedEntry) return;
    setSavingReach(true);
    try {
      const body: Record<string, any> = { calendarEntryId: selectedEntry.id };
      PLATFORMS.forEach((p) => {
        const key = p.toLowerCase() + "Reach";
        const val = reachForm[p]?.trim();
        body[key] = val ? parseInt(val, 10) : 0;
      });
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        console.error("Failed to save reach:", errData.error);
        return;
      }
      setReachModalOpen(false);
    } catch (error) {
      console.error("Failed to save reach:", error);
    } finally {
      setSavingReach(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  async function handleTimerAction(action: string, taskType: string, taskId: string) {
    try {
      await fetch("/api/time-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, taskType, taskId }),
      });
      await fetchActiveTimer();
      await fetchAllTimerTotals();
      setNow(Date.now());
    } catch (error) {
      console.error("Failed to handle timer action:", error);
    }
  }

  function isTimerRunning(taskType: string, taskId: string) {
    return activeTimer?.taskType === taskType && activeTimer?.taskId === taskId;
  }

  function getTimerElapsed(taskType: string, taskId: string) {
    const key = `${taskType}_${taskId}`;
    const completed = timerTotals[key] || 0;
    if (isTimerRunning(taskType, taskId) && activeTimer) {
      const running = Math.floor((now - new Date(activeTimer.startTime).getTime()) / 1000);
      return completed + running;
    }
    return completed;
  }

  function canMarkComplete(status: string) {
    return !["POSTED", "APPROVED", "SCHEDULED"].includes(status);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || "Resource"}
          </h1>
          <p className="text-gray-500 mt-1">Your assigned tasks and upcoming deadlines.</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="w-44">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <span className="text-gray-400 pb-2">to</span>
          <div className="w-44">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-3">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Upcoming Deadlines (Next 7 Days)</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.client?.name || "-"} &middot; {formatDate(new Date(t.postingDate))}</p>
                </div>
                <Badge variant="warning">{getStatusLabel(t.status)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {adhocTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">My Adhoc Tasks</h2>
            </div>
            <span className="text-sm text-gray-500">{adhocTasks.length} tasks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Deadline</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                  {adhocTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{t.title}</td>
                    <td className="px-5 py-3 text-gray-600">{t.client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{t.deadline ? formatDate(new Date(t.deadline)) : "-"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={t.status === "COMPLETED" ? "success" : t.status === "IN_PROGRESS" ? "info" : t.status === "NEW" ? "warning" : "default"}>
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                      {formatDuration(getTimerElapsed("ADHOC", t.id))}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {isTimerRunning("ADHOC", t.id) ? (
                          <>
                            <button
                              onClick={() => handleTimerAction("pause", "ADHOC", t.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleTimerAction("stop", "ADHOC", t.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Stop"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleTimerAction("start", "ADHOC", t.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Start"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {isAdminUser && (
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">My Calendar Tasks</h2>
          </div>
          <span className="text-sm text-gray-500">{tasks.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Posting Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">SLA</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.length > 0 ? (
                tasks.map((entry) => {
                  const sla = getSLAStatus({
                    status: entry.status,
                    postingDate: new Date(entry.postingDate),
                  });
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{entry.title}</td>
                      <td className="px-5 py-3 text-gray-600">{entry.client?.name || "-"}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(new Date(entry.postingDate))}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          sla.color === "🔴" ? "bg-red-100 text-red-700" :
                          sla.color === "🟡" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {sla.color} {sla.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                        {formatDuration(getTimerElapsed("CALENDAR", entry.id))}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {isTimerRunning("CALENDAR", entry.id) ? (
                            <>
                              <button
                                onClick={() => handleTimerAction("pause", "CALENDAR", entry.id)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleTimerAction("stop", "CALENDAR", entry.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Stop"
                              >
                                <Square className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleTimerAction("start", "CALENDAR", entry.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Start"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {canMarkComplete(entry.status) && (
                            <Button size="sm" variant="outline" isLoading={completing === entry.id} onClick={() => handleMarkComplete(entry.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {entry.status === "POSTED" && isAdminUser && (
                            <Button size="sm" variant="outline" onClick={() => openReachModal(entry)}>
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No tasks assigned to you yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={reachModalOpen} onClose={() => setReachModalOpen(false)} title={`Post Reach - ${selectedEntry?.title || ""}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Enter the reach for each platform:</p>
          {PLATFORMS.map((p) => (
            <Input key={p} label={`${p} Reach`} type="number" value={reachForm[p] || ""} onChange={(e) => setReachForm({ ...reachForm, [p]: e.target.value })} placeholder="0" />
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setReachModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveReach} isLoading={savingReach}>Save Reach</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
