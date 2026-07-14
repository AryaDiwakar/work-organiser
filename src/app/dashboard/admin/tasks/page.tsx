"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatDuration, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Download, Trash2, Edit2, Eye, Clock } from "lucide-react";
import { TimeLogModal } from "@/components/ui/TimeLogModal";
import * as XLSX from "xlsx";

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  assignedUser: { id: string; name: string } | null;
  client: { id: string; name: string };
  createdAt: string;
}

interface TaskForm {
  title: string;
  description: string;
  clientId: string;
  assignedTo: string;
  deadline: string;
}

const defaultForm: TaskForm = { title: "", description: "", clientId: "", assignedTo: "", deadline: "" };

const TASK_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "INTERNAL_FEEDBACK", label: "Internal Feedback" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

function getDeadlineColor(deadline: string | null, status?: string): string {
  if (!deadline) return "";
  if (status === "COMPLETED" || status === "NOT_APPLICABLE") return "text-green-600 font-semibold";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-red-600 font-semibold";
  if (diffDays <= 2) return "text-yellow-600 font-semibold";
  return "text-green-600 font-semibold";
}

function sortByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "COMPLETED": return "success" as const;
    case "IN_PROGRESS": return "info" as const;
    case "INTERNAL_FEEDBACK": return "warning" as const;
    case "CLIENT_FEEDBACK": return "danger" as const;
    case "NEW": return "warning" as const;
    case "NOT_APPLICABLE": return "default" as const;
    default: return "default" as const;
  }
}

export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [timerTotals, setTimerTotals] = useState<Record<string, number>>({});
  const [timeLogModal, setTimeLogModal] = useState<{ taskId: string; title: string } | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchClients();
    fetchUsers();
  }, [clientFilter, resourceFilter, startDate, endDate]);

  useEffect(() => {
    if (tasks.length) {
      const ids = tasks.map((t) => t.id).join(",");
      fetch(`/api/time-tracker?taskType=ADHOC&taskIds=${ids}`)
        .then((r) => r.json())
        .then((data) => setTimerTotals(data || {}))
        .catch(() => {});
    }
  }, [tasks.length]);

  async function fetchTasks() {
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set("clientId", clientFilter);
      if (resourceFilter) params.set("assignedTo", resourceFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

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

  function openAddModal() {
    setEditingTask(null);
    setForm(defaultForm);
    setModalOpen(true);
    setError("");
  }

  function openViewModal(task: Task) {
    setViewTask(task);
    setViewModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      clientId: task.client?.id || "",
      assignedTo: task.assignedUser?.id || "",
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSave() {
    if (!form.title.trim() || !form.clientId) {
      setError("Title and Client are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deadline: form.deadline || null,
          assignedTo: form.assignedTo || null,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchTasks();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save task");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to save task:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTasks();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  function downloadExcel() {
    const data = tasks.map((t) => ({
      Title: t.title,
      Client: t.client?.name || "-",
      "Assigned To": t.assignedUser?.name || "Unassigned",
      Deadline: t.deadline ? formatDate(t.deadline) : "-",
      Status: t.status.replace(/_/g, " "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${startDate || "all"}_to_${endDate || "all"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sortedTasks = sortByDeadline(tasks).filter((t) => !statusFilter || t.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adhoc Tasks</h1>
          <p className="text-gray-500 mt-1">Manage adhoc tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-56">
          <Select
            options={[
              { value: "", label: "All Clients" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            options={[
              { value: "", label: "All Resources" },
              ...users.filter((u: any) => u.role !== "SUPER_ADMIN").map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          />
        </div>
        <div className="w-52">
          <Select
            options={[
              { value: "", label: "All Statuses" },
              ...TASK_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Assigned To</th>
                <th className="px-5 py-3 font-medium">Deadline</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : sortedTasks.length > 0 ? (
                sortedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-5 py-3 text-gray-600">{task.client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{task.assignedUser?.name || "Unassigned"}</td>
                    <td className={`px-5 py-3 ${getDeadlineColor(task.deadline, task.status)}`}>
                      {task.deadline ? formatDate(task.deadline) : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {(task.status === "COMPLETED" || task.status === "NOT_APPLICABLE") ? (
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status.replace(/_/g, " ")}
                        </Badge>
                      ) : isAdmin ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {TASK_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                      {formatDuration(timerTotals[task.id] || 0)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTimeLogModal({ taskId: task.id, title: task.title })}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                          title="View time logs"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openViewModal(task)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                          title="View task"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && task.status !== "COMPLETED" && task.status !== "NOT_APPLICABLE" && (
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                            title="Edit task"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    No tasks found. Click &quot;Add Task&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Task Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Task Details" size="lg">
        {viewTask && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Title</label>
              <p className="text-gray-900 mt-1">{viewTask.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Client</label>
              <p className="text-gray-900 mt-1">{viewTask.client?.name || "-"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Assigned To</label>
              <p className="text-gray-900 mt-1">{viewTask.assignedUser?.name || "Unassigned"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Deadline</label>
              <p className={`text-gray-900 mt-1 ${getDeadlineColor(viewTask.deadline, viewTask.status)}`}>
                {viewTask.deadline ? formatDate(viewTask.deadline) : "-"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(viewTask.status)}>
                  {viewTask.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewTask.description || "No description"}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Task Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? "Edit Task" : "Add Task"} size="lg">
        <div className="space-y-4">
          <Input label="Title" id="taskTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="Client"
            placeholder="Select a client"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          />
          <Select
            label="Assigned To"
            options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          />
          <Input label="Deadline" id="taskDeadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <div className="w-full">
            <label htmlFor="taskDesc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="taskDesc"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingTask ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <TimeLogModal
        isOpen={!!timeLogModal}
        onClose={() => setTimeLogModal(null)}
        taskType="ADHOC"
        taskId={timeLogModal?.taskId || ""}
        taskTitle={timeLogModal?.title || ""}
      />
    </div>
  );
}
