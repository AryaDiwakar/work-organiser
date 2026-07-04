"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDate, formatDateTime, getStatusLabel, getStatusColor, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Calendar, ClipboardList, BarChart3, Plus, Trash2 } from "lucide-react";

const PLATFORMS = ["Linkedin", "Facebook", "Instagram", "Youtube", "Google", "Twitter"];
const POST_TYPES = ["POSTER", "REEL", "VIDEO", "GIF", "CAROUSEL", "STORY", "STATIC"];

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

const TASK_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

type Tab = "calendar" | "tasks" | "reports";

interface CalendarForm {
  title: string;
  categoryId: string;
  postType: string;
  platforms: string[];
  creativeBrief: string;
  caption: string;
  hashtags: string;
  designDirection: string;
  referenceLinks: string;
  postingDate: string;
  postingTime: string;
  assignedTo: string;
}

const defaultForm: CalendarForm = {
  title: "", categoryId: "", postType: "POSTER", platforms: [],
  creativeBrief: "", caption: "", hashtags: "", designDirection: "",
  referenceLinks: "", postingDate: "", postingTime: "", assignedTo: "",
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [client, setClient] = useState<any>(null);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CalendarForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) { fetchAll(); fetchUsers(); fetchCategories(); }
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
      setError("Failed to load client data");
    } finally {
      setLoading(false);
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

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }

  function openAddModal() {
    const now = new Date().toISOString().split("T")[0];
    setForm({ ...defaultForm, postingDate: now });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        clientId: id,
        hashtags: form.hashtags?.split(",").map((h: string) => h.trim()).filter(Boolean) || [],
        referenceLinks: form.referenceLinks?.split("\n").map((r: string) => r.trim()).filter(Boolean) || [],
      };
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchAll();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create entry");
      }
    } catch (error) {
      setError("Network error - please try again");
      console.error("Failed to create entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) fetchAll();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  async function handleCalendarStatusChange(entryId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/calendar/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update status");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to update status:", error);
    }
  }

  async function handleTaskStatusChange(taskId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAll();
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  }

  function togglePlatform(platform: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client && !loading) {
    return <p className="text-red-500 text-center py-12">{error || "Client not found."}</p>;
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
              {client.website && <span>{client.website} | </span>}
              {client.project && <span>Project: {client.project}</span>}
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
          <div className="flex items-center justify-between pr-4">
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
            {activeTab === "calendar" && (
              <Button size="sm" onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-1" />
                Add Entry
              </Button>
            )}
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
                          {isAdmin ? (
                            <select
                              value={entry.status}
                              onChange={(e) => handleCalendarStatusChange(entry.id, e.target.value)}
                              className="block w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {CALENDAR_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                              {getStatusLabel(entry.status)}
                            </span>
                          )}
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
                    <th className="px-4 py-3 font-medium">Actions</th>
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
                          {isAdmin ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                              className="block w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {TASK_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "info" : task.status === "NEW" ? "warning" : "default"}>
                              {task.status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Calendar Entry" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-indigo-600 font-medium">Client: {client.name}</p>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Enter post title" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" placeholder="Select a category" options={categories.map((c: any) => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
            <Select label="Type of Post" options={POST_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Posting Date" type="date" value={form.postingDate} onChange={(e) => setForm({ ...form, postingDate: e.target.value })} required />
            <Input label="Posting Time" type="time" value={form.postingTime} onChange={(e) => setForm({ ...form, postingTime: e.target.value })} />
          </div>
          <Select label="Assigned To" options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.name }))]} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    form.platforms.includes(p) ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >{p}</button>
              ))}
            </div>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative Brief</label>
            <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.creativeBrief} onChange={(e) => setForm({ ...form, creativeBrief: e.target.value })} />
          </div>
          <Input label="Caption & Hashtags" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          <Input label="Design Direction" value={form.designDirection} onChange={(e) => setForm({ ...form, designDirection: e.target.value })} />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Links</label>
            <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.referenceLinks} onChange={(e) => setForm({ ...form, referenceLinks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Create Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
