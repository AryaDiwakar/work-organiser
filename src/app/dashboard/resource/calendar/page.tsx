"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { TimeLogModal } from "@/components/ui/TimeLogModal";
import { Modal } from "@/components/ui/Modal";
import { Calendar, Clock, Play, Pause, Square, ClipboardList, Eye, Pencil } from "lucide-react";

const CALENDAR_STATUS_OPTIONS = [
  { value: "YET_TO_BE_DONE", label: "Yet to be done" },
  { value: "STORYBOARD_COMPLETED", label: "Storyboard Completed" },
  { value: "DESIGNED", label: "Designed" },
  { value: "SHARED_TO_CLIENT", label: "Shared to client" },
  { value: "APPROVED", label: "Approved" },
  { value: "INTERNAL_FEEDBACK", label: "Internal Feedback" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "POSTED", label: "Posted" },
  { value: "REJECTED", label: "Rejected" },
];

const ADHOC_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "INTERNAL_FEEDBACK", label: "Internal Feedback" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  postingDate: string;
  status: string;
  assignedUser: { id: string; name: string } | null;
  postType?: string;
  platform?: string[];
  category?: { id: string; name: string; color: string } | null;
  creativeBrief?: string | null;
  caption?: string | null;
  hashtags?: string[];
  designDirection?: string | null;
  postingTime?: string | null;
}

interface AdhocTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  client: { id: string; name: string } | null;
}

export default function ResourceCalendarPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCalendarIds, setActiveCalendarIds] = useState<string[] | null>(null);
  const [activeAdhocIds, setActiveAdhocIds] = useState<string[]>([]);
  const [adhocTasks, setAdhocTasks] = useState<AdhocTask[]>([]);
  const [timerTotals, setTimerTotals] = useState<Record<string, number>>({});
  const [adhocTimerTotals, setAdhocTimerTotals] = useState<Record<string, number>>({});
  const [activeTimer, setActiveTimer] = useState<{ taskType: string; taskId: string; startTime: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timeLogModal, setTimeLogModal] = useState<{ taskType: string; taskId: string; title: string } | null>(null);
  const [viewEntry, setViewEntry] = useState<CalendarEntry | null>(null);
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [viewAdhocTask, setViewAdhocTask] = useState<AdhocTask | null>(null);
  const [editAdhocTask, setEditAdhocTask] = useState<AdhocTask | null>(null);
  const [editAdhocStatus, setEditAdhocStatus] = useState("");
  const [savingAdhocStatus, setSavingAdhocStatus] = useState(false);

  const displayEntries = (workDate && activeCalendarIds !== null
    ? entries.filter((e) => activeCalendarIds.includes(e.id))
    : entries
  ).filter((e) => !statusFilter || e.status === statusFilter);

  useEffect(() => {
    if (userId) fetchEntries();
  }, [startDate, endDate, userId]);

  useEffect(() => {
    if (workDate) {
      fetch(`/api/time-tracker/active-tasks?date=${workDate}&userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          setActiveCalendarIds(data.calendarIds || []);
          setActiveAdhocIds(data.adhocIds || []);
        })
        .catch(() => {
          setActiveCalendarIds([]);
          setActiveAdhocIds([]);
        });
    } else {
      setActiveCalendarIds(null);
      setActiveAdhocIds([]);
    }
  }, [workDate, userId]);

  useEffect(() => {
    if (activeAdhocIds.length > 0) {
      fetch(`/api/tasks?ids=${activeAdhocIds.join(",")}&assignedTo=${userId}`)
        .then((r) => r.json())
        .then((data) => setAdhocTasks(Array.isArray(data) ? data : data.data || []))
        .catch(() => setAdhocTasks([]));
    } else {
      setAdhocTasks([]);
    }
  }, [activeAdhocIds, userId]);

  useEffect(() => {
    if (userId) {
      fetch("/api/time-tracker")
        .then((r) => r.json())
        .then((data) => {
          if (data?.active) setActiveTimer({ taskType: data.active.taskType, taskId: data.active.taskId, startTime: data.active.startTime });
          else setActiveTimer(null);
        })
        .catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (displayEntries.length) {
      const ids = displayEntries.map((e) => e.id).join(",");
      const dateParam = workDate ? `&date=${workDate}` : "";
      fetch(`/api/time-tracker?taskType=CALENDAR&taskIds=${ids}${dateParam}`)
        .then((r) => r.json())
        .then((data) => setTimerTotals(data || {}))
        .catch(() => {});
    }
  }, [displayEntries.length, workDate]);

  useEffect(() => {
    if (adhocTasks.length) {
      const ids = adhocTasks.map((t) => t.id).join(",");
      const dateParam = workDate ? `&date=${workDate}` : "";
      fetch(`/api/time-tracker?taskType=ADHOC&taskIds=${ids}${dateParam}`)
        .then((r) => r.json())
        .then((data) => setAdhocTimerTotals(data || {}))
        .catch(() => {});
    }
  }, [adhocTasks.length, workDate]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ assignedTo: userId });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTimerAction(action: string, taskType: string, taskId: string) {
    await fetch("/api/time-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, taskType, taskId }),
    });
    const res = await fetch("/api/time-tracker");
    const data = await res.json();
    if (data?.active) setActiveTimer({ taskType: data.active.taskType, taskId: data.active.taskId, startTime: data.active.startTime });
    else setActiveTimer(null);
    setNow(Date.now());
  }

  function isTimerRunning(taskType: string, taskId: string) {
    return activeTimer?.taskType === taskType && activeTimer?.taskId === taskId;
  }

  function getTimerElapsed(taskType: string, taskId: string) {
    const completed = timerTotals[taskId] || 0;
    if (isTimerRunning(taskType, taskId) && activeTimer) {
      const running = Math.floor((now - new Date(activeTimer.startTime).getTime()) / 1000);
      return completed + running;
    }
    return completed;
  }

  function getAdhocTimerElapsed(taskId: string) {
    return adhocTimerTotals[taskId] || 0;
  }

  async function handleUpdateCalendarStatus(entryId: string, newStatus: string) {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/calendar/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEditEntry(null);
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleUpdateAdhocStatus(taskId: string, newStatus: string) {
    setSavingAdhocStatus(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEditAdhocTask(null);
        if (activeAdhocIds.length > 0) {
          fetch(`/api/tasks?ids=${activeAdhocIds.join(",")}&assignedTo=${userId}`)
            .then((r) => r.json())
            .then((data) => setAdhocTasks(Array.isArray(data) ? data : data.data || []))
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error("Failed to update adhoc status:", error);
    } finally {
      setSavingAdhocStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
        <p className="text-gray-500 mt-1">View your assigned tasks by month.</p>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-44">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="w-44">
          <Input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
          {workDate && (
            <button onClick={() => setWorkDate("")} className="text-xs text-indigo-600 hover:text-indigo-800 mt-1">
              Clear work date
            </button>
          )}
        </div>
        <div className="w-52">
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "YET_TO_BE_DONE", label: "Yet to be done" },
              { value: "STORYBOARD_COMPLETED", label: "Storyboard Completed" },
              { value: "DESIGNED", label: "Designed" },
              { value: "SHARED_TO_CLIENT", label: "Shared to client" },
              { value: "APPROVED", label: "Approved" },
              { value: "INTERNAL_FEEDBACK", label: "Internal Feedback" },
              { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
              { value: "SCHEDULED", label: "Scheduled" },
              { value: "POSTED", label: "Posted" },
              { value: "REJECTED", label: "Rejected" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {workDate ? `Calendar Tasks - ${formatDate(workDate)}` : "Assigned Calendar Tasks"}
          </h2>
          <span className="text-sm text-gray-500 ml-auto">{displayEntries.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Posting Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">SLA Status</th>
                {workDate && <th className="px-5 py-3 font-medium">Time</th>}
                {workDate && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={workDate ? 7 : 5} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : displayEntries.length > 0 ? (
                displayEntries.map((entry) => {
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
                      {workDate && (
                        <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                          {formatDuration(getTimerElapsed("CALENDAR", entry.id))}
                        </td>
                      )}
                      {workDate && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            {isTimerRunning("CALENDAR", entry.id) ? (
                              <>
                                <button onClick={() => handleTimerAction("pause", "CALENDAR", entry.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Pause">
                                  <Pause className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleTimerAction("stop", "CALENDAR", entry.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Stop">
                                  <Square className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleTimerAction("start", "CALENDAR", entry.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Start">
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => setTimeLogModal({ taskType: "CALENDAR", taskId: entry.id, title: entry.title })} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50" title="View time logs">
                              <Clock className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewEntry(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="View details">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setEditEntry(entry); setEditStatus(entry.status); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50" title="Edit status">
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={workDate ? 7 : 5} className="px-5 py-8 text-center text-gray-400">
                    {workDate ? "No calendar tasks with activity on this date." : "No tasks assigned to you for this month."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {workDate && adhocTasks.filter((t) => !statusFilter || t.status === statusFilter).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Adhoc Tasks - {formatDate(workDate)}</h2>
            <span className="text-sm text-gray-500 ml-auto">{adhocTasks.filter((t) => !statusFilter || t.status === statusFilter).length} tasks</span>
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
                {adhocTasks.filter((t) => !statusFilter || t.status === statusFilter).map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-5 py-3 text-gray-600">{task.client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{task.deadline ? formatDate(new Date(task.deadline)) : "-"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "info" : "default"}>
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                      {formatDuration(getAdhocTimerElapsed(task.id))}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {isTimerRunning("ADHOC", task.id) ? (
                          <>
                            <button onClick={() => handleTimerAction("pause", "ADHOC", task.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Pause">
                              <Pause className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleTimerAction("stop", "ADHOC", task.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Stop">
                              <Square className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleTimerAction("start", "ADHOC", task.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Start">
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => setTimeLogModal({ taskType: "ADHOC", taskId: task.id, title: task.title })} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50" title="View time logs">
                          <Clock className="h-4 w-4" />
                        </button>
                        <button onClick={() => setViewAdhocTask(task)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="View details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditAdhocTask(task); setEditAdhocStatus(task.status); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50" title="Edit status">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TimeLogModal
        isOpen={!!timeLogModal}
        onClose={() => setTimeLogModal(null)}
        taskType={timeLogModal?.taskType || ""}
        taskId={timeLogModal?.taskId || ""}
        taskTitle={timeLogModal?.title || ""}
      />

      {viewEntry && (
        <Modal isOpen={!!viewEntry} onClose={() => setViewEntry(null)} title="Calendar Task Details" size="lg">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="font-medium text-gray-500">Title:</span> <span className="text-gray-900">{viewEntry.title}</span></div>
              <div><span className="font-medium text-gray-500">Client:</span> <span className="text-gray-900">{viewEntry.client?.name || "-"}</span></div>
              <div><span className="font-medium text-gray-500">Type:</span> <span className="text-gray-900">{viewEntry.postType || "-"}</span></div>
              <div><span className="font-medium text-gray-500">Category:</span> <span className="text-gray-900">{viewEntry.category?.name || "-"}</span></div>
              <div><span className="font-medium text-gray-500">Platforms:</span> <span className="text-gray-900">{viewEntry.platform?.join(", ") || "-"}</span></div>
              <div><span className="font-medium text-gray-500">Posting Date:</span> <span className="text-gray-900">{formatDate(new Date(viewEntry.postingDate))}{viewEntry.postingTime ? ` ${viewEntry.postingTime}` : ""}</span></div>
              <div><span className="font-medium text-gray-500">Status:</span> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewEntry.status)}`}>{getStatusLabel(viewEntry.status)}</span></div>
            </div>
            {viewEntry.creativeBrief && <div><span className="font-medium text-gray-500">Creative Brief:</span> <span className="text-gray-900">{viewEntry.creativeBrief}</span></div>}
            {viewEntry.caption && <div><span className="font-medium text-gray-500">Caption:</span> <span className="text-gray-900">{viewEntry.caption}</span></div>}
            {viewEntry.hashtags && viewEntry.hashtags.length > 0 && <div><span className="font-medium text-gray-500">Hashtags:</span> <span className="text-gray-900">{viewEntry.hashtags.join(", ")}</span></div>}
            {viewEntry.designDirection && <div><span className="font-medium text-gray-500">Design Direction:</span> <span className="text-gray-900">{viewEntry.designDirection}</span></div>}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setViewEntry(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {editEntry && (
        <Modal isOpen={!!editEntry} onClose={() => setEditEntry(null)} title="Edit Task Status" size="md">
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Task:</span> {editEntry.title}</p>
              <p><span className="font-medium">Client:</span> {editEntry.client?.name || "-"}</p>
            </div>
            <Select
              label="Status"
              options={CALENDAR_STATUS_OPTIONS}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditEntry(null)}>Cancel</Button>
              <Button onClick={() => handleUpdateCalendarStatus(editEntry.id, editStatus)} isLoading={savingStatus}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {viewAdhocTask && (
        <Modal isOpen={!!viewAdhocTask} onClose={() => setViewAdhocTask(null)} title="Adhoc Task Details" size="md">
          <div className="space-y-3 text-sm">
            <div><span className="font-medium text-gray-500">Title:</span> <span className="text-gray-900">{viewAdhocTask.title}</span></div>
            <div><span className="font-medium text-gray-500">Client:</span> <span className="text-gray-900">{viewAdhocTask.client?.name || "-"}</span></div>
            <div><span className="font-medium text-gray-500">Deadline:</span> <span className="text-gray-900">{viewAdhocTask.deadline ? formatDate(new Date(viewAdhocTask.deadline)) : "-"}</span></div>
            <div><span className="font-medium text-gray-500">Status:</span> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewAdhocTask.status === "COMPLETED" ? "bg-green-100 text-green-700" : viewAdhocTask.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{viewAdhocTask.status.replace(/_/g, " ")}</span></div>
            {viewAdhocTask.description && <div><span className="font-medium text-gray-500">Description:</span> <span className="text-gray-900">{viewAdhocTask.description}</span></div>}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setViewAdhocTask(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {editAdhocTask && (
        <Modal isOpen={!!editAdhocTask} onClose={() => setEditAdhocTask(null)} title="Edit Adhoc Task Status" size="md">
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Task:</span> {editAdhocTask.title}</p>
              <p><span className="font-medium">Client:</span> {editAdhocTask.client?.name || "-"}</p>
            </div>
            <Select
              label="Status"
              options={ADHOC_STATUS_OPTIONS}
              value={editAdhocStatus}
              onChange={(e) => setEditAdhocStatus(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditAdhocTask(null)}>Cancel</Button>
              <Button onClick={() => handleUpdateAdhocStatus(editAdhocTask.id, editAdhocStatus)} isLoading={savingAdhocStatus}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
