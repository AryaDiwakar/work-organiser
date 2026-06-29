"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
  postType: string;
  platform: string[];
  postingDate: string;
  assignedUser: { id: string; name: string } | null;
  status: string;
  slaStatus: string | null;
}

interface CalendarForm {
  title: string;
  clientId: string;
  categoryId: string;
  postType: string;
  platform: string;
  postingDate: string;
  assignedTo: string;
  description: string;
}

const defaultForm: CalendarForm = {
  title: "", clientId: "", categoryId: "", postType: "POSTER",
  platform: "", postingDate: "", assignedTo: "", description: "",
};

const POST_TYPES = [
  { value: "POSTER", label: "Poster" },
  { value: "REEL", label: "Reel" },
  { value: "VIDEO", label: "Video" },
  { value: "CAROUSEL", label: "Carousel" },
  { value: "STORY", label: "Story" },
  { value: "STATIC", label: "Static" },
];

const STATUS_OPTIONS = [
  { value: "YET_TO_BE_DONE", label: "Yet to be done" },
  { value: "DESIGNED", label: "Designed" },
  { value: "SHARED_TO_CLIENT", label: "Shared to client" },
  { value: "APPROVED", label: "Approved" },
  { value: "PR_FEEDBACK", label: "PR Feedback" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "POSTED", label: "Posted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "STORYBOARD_COMPLETED", label: "Storyboard Completed" },
];

export default function CalendarPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [clientFilter, setClientFilter] = useState("");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [form, setForm] = useState<CalendarForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchClients();
    fetchUsers();
    fetchCategories();
  }, [month, year, clientFilter]);

  async function fetchEntries() {
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (clientFilter) params.set("clientId", clientFilter);
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
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
    setEditingEntry(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openEditModal(entry: CalendarEntry) {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      clientId: entry.client?.id || "",
      categoryId: entry.category?.id || "",
      postType: entry.postType,
      platform: entry.platform?.join(", ") || "",
      postingDate: entry.postingDate?.split("T")[0] || "",
      assignedTo: entry.assignedUser?.id || "",
      description: "",
    });
    setEditModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.clientId || !form.postingDate) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        platform: form.platform.split(",").map((p) => p.trim()).filter(Boolean),
      };
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingEntry) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        categoryId: form.categoryId,
        postType: form.postType,
        platform: form.platform.split(",").map((p) => p.trim()).filter(Boolean),
        postingDate: form.postingDate,
        assignedTo: form.assignedTo || null,
      };
      const res = await fetch(`/api/calendar/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditModalOpen(false);
        setEditingEntry(null);
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to update entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(entryId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/calendar/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchEntries();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function generateAICalendar() {
    setGenerating(true);
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, clientId: clientFilter || undefined }),
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to generate calendar:", error);
    } finally {
      setGenerating(false);
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  }

  const filteredCategories = form.clientId
    ? categories.filter((c: any) => c.clientId === form.clientId)
    : categories;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">AI-powered monthly calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={generateAICalendar} isLoading={generating}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Calendar
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">
            <ChevronRight className="h-4 w-4" />
          </button>
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Posting Date</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">SLA</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="inline-flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                    </div>
                  </td>
                </tr>
              ) : entries.length > 0 ? (
                entries.map((entry) => {
                  const sla = getSLAStatus({
                    status: entry.status,
                    postingDate: new Date(entry.postingDate),
                  });
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openEditModal(entry)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.title}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.client?.name || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.category?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{entry.postType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.platform?.join(", ") || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(entry.postingDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.assignedUser?.name || "-"}</td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <select
                            value={entry.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                            className="block w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-lg">{sla.color}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(entry)}>
                          <span className="text-gray-400">...</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No calendar entries found. Click &quot;Generate AI Calendar&quot; or &quot;Add Entry&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Calendar Entry" size="lg">
        <div className="space-y-4">
          <Input label="Title" id="entryTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="Client"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={form.clientId}
            onChange={(e) => { setForm({ ...form, clientId: e.target.value, categoryId: "" }); }}
          />
          <Select
            label="Category"
            options={filteredCategories.map((c: any) => ({ value: c.id, label: c.name }))}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          />
          <Select
            label="Post Type"
            options={POST_TYPES}
            value={form.postType}
            onChange={(e) => setForm({ ...form, postType: e.target.value })}
          />
          <Input label="Platforms (comma separated)" id="platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
          <Input label="Posting Date" id="postingDate" type="date" value={form.postingDate} onChange={(e) => setForm({ ...form, postingDate: e.target.value })} required />
          <Select
            label="Assigned To"
            options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          />
          <div className="w-full">
            <label htmlFor="entryDesc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="entryDesc"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingEntry(null); }} title="Edit Calendar Entry" size="lg">
        <div className="space-y-4">
          <Input label="Title" id="editTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select
            label="Category"
            options={filteredCategories.map((c: any) => ({ value: c.id, label: c.name }))}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          />
          <Select
            label="Post Type"
            options={POST_TYPES}
            value={form.postType}
            onChange={(e) => setForm({ ...form, postType: e.target.value })}
          />
          <Input label="Platforms (comma separated)" id="editPlatform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
          <Input label="Posting Date" id="editPostingDate" type="date" value={form.postingDate} onChange={(e) => setForm({ ...form, postingDate: e.target.value })} />
          <Select
            label="Assigned To"
            options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingEntry(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} isLoading={saving}>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
