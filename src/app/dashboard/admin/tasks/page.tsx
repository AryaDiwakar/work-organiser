"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus } from "lucide-react";

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
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchClients();
    fetchUsers();
  }, [clientFilter]);

  async function fetchTasks() {
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set("clientId", clientFilter);
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
    setForm(defaultForm);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.clientId) {
      setError("Title and Client are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
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
        setError(errData.error || "Failed to create task");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to create task:", error);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success" as const;
      case "IN_PROGRESS": return "info" as const;
      case "NEW": return "warning" as const;
      case "NOT_APPLICABLE": return "default" as const;
      default: return "default" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adhoc Tasks</h1>
          <p className="text-gray-500 mt-1">Manage adhoc tasks</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

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
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : tasks.length > 0 ? (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-5 py-3 text-gray-600">{task.client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{task.assignedUser?.name || "Unassigned"}</td>
                    <td className="px-5 py-3 text-gray-600">{task.deadline ? formatDate(task.deadline) : "-"}</td>
                    <td className="px-5 py-3">
                      {isAdmin ? (
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
                    <td className="px-5 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "COMPLETED")}
                      >
                        Complete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No tasks found. Click &quot;Add Task&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Task" size="lg">
        <div className="space-y-4">
          <Input label="Title" id="taskTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="Client"
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
            <Button onClick={handleSave} isLoading={saving}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
