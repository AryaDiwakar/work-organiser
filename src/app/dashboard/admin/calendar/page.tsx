"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, BarChart3 } from "lucide-react";

const PLATFORMS = ["Linkedin", "Facebook", "Instagram", "Youtube", "Google", "Twitter"];
const POST_TYPES = ["POSTER", "REEL", "VIDEO", "GIF", "CAROUSEL", "STORY", "STATIC"];

const STATUS_OPTIONS = [
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

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
  postType: string;
  platform: string[];
  creativeBrief: string | null;
  caption: string | null;
  hashtags: string[];
  designDirection: string | null;
  referenceLinks: string[];
  postingDate: string;
  postingTime: string | null;
  assignedUser: { id: string; name: string } | null;
  status: string;
  slaStatus: string | null;
}

interface CalendarForm {
  title: string;
  clientId: string;
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
  title: "", clientId: "", categoryId: "", postType: "POSTER",
  platforms: [], creativeBrief: "", caption: "", hashtags: "",
  designDirection: "", referenceLinks: "", postingDate: "", postingTime: "",
  assignedTo: "",
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
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
  const [error, setError] = useState("");
  const [reachModalOpen, setReachModalOpen] = useState(false);
  const [reachEntry, setReachEntry] = useState<CalendarEntry | null>(null);
  const [reachForm, setReachForm] = useState<Record<string, string>>({});
  const [savingReach, setSavingReach] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchClients();
    fetchUsers();
    fetchCategories();
  }, [startDate, endDate, clientFilter]);

  async function fetchEntries() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
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
    setError("");
  }

  function openEditModal(entry: CalendarEntry) {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      clientId: entry.client?.id || "",
      categoryId: entry.category?.id || "",
      postType: entry.postType,
      platforms: entry.platform || [],
      creativeBrief: entry.creativeBrief || "",
      caption: entry.caption || "",
      hashtags: (entry.hashtags || []).join(", "),
      designDirection: entry.designDirection || "",
      referenceLinks: (entry.referenceLinks || []).join("\n"),
      postingDate: entry.postingDate?.split("T")[0] || "",
      postingTime: entry.postingTime || "",
      assignedTo: entry.assignedUser?.id || "",
    });
    setEditModalOpen(true);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
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
        fetchEntries();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create entry");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to create entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingEntry) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title,
        clientId: form.clientId,
        categoryId: form.categoryId,
        postType: form.postType,
        platforms: form.platforms,
        creativeBrief: form.creativeBrief,
        caption: form.caption,
        hashtags: form.hashtags?.split(",").map((h: string) => h.trim()).filter(Boolean) || [],
        designDirection: form.designDirection,
        referenceLinks: form.referenceLinks.split("\n").map((r) => r.trim()).filter(Boolean),
        postingDate: form.postingDate,
        postingTime: form.postingTime,
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
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update entry");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to update entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(entryId: string, newStatus: string) {
    try {
      setError("");
      const res = await fetch(`/api/calendar/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchEntries();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update status");
      }
    } catch (error) {
      setError("Network error");
      console.error("Failed to update status:", error);
    }
  }

  function openReachModal(entry: CalendarEntry) {
    setReachEntry(entry);
    setReachForm({});
    setReachModalOpen(true);
  }

  async function handleSaveReach() {
    if (!reachEntry) return;
    setSavingReach(true);
    try {
      const body: Record<string, any> = { calendarEntryId: reachEntry.id };
      PLATFORMS.forEach((p) => {
        const key = p.toLowerCase() + "Reach";
        body[key] = reachForm[p] ? parseInt(reachForm[p]) : 0;
      });
      await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setReachModalOpen(false);
    } catch (error) {
      console.error("Failed to save reach:", error);
    } finally {
      setSavingReach(false);
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

  const calendarFormFields = (
    <div className="space-y-4">
      <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Enter post title" />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Client" options={clients.map((c) => ({ value: c.id, label: c.name }))} value={form.clientId} onChange={(e) => { setForm({ ...form, clientId: e.target.value, categoryId: "" }); }} />
        <Select label="Category" placeholder="Select a category" options={categories.map((c: any) => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type of Post" options={POST_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value })} />
        <Input label="Posting Time" type="time" value={form.postingTime} onChange={(e) => setForm({ ...form, postingTime: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Posting Date" type="date" value={form.postingDate} onChange={(e) => setForm({ ...form, postingDate: e.target.value })} required />
        <Select label="Assigned To" options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.name }))]} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                form.platforms.includes(p)
                  ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Creative Brief</label>
        <textarea rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.creativeBrief} onChange={(e) => setForm({ ...form, creativeBrief: e.target.value })} placeholder="Brief description of the creative direction" />
      </div>
      <Input label="Caption & Hashtags" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Enter caption with hashtags" />
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Design Direction Suggestions</label>
        <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.designDirection} onChange={(e) => setForm({ ...form, designDirection: e.target.value })} placeholder="Color palette, font style, mood board references" />
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Links (one per line)</label>
        <textarea rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.referenceLinks} onChange={(e) => setForm({ ...form, referenceLinks: e.target.value })} placeholder="https://example.com/reference1" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">Monthly content calendar</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
        <span className="text-gray-400">to</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

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
                    <tr key={entry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEditModal(entry)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.title}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.client?.name || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.category?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{entry.postType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.platform?.join(", ") || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(entry.postingDate)}{entry.postingTime ? ` ${entry.postingTime}` : ""}
                      </td>
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
                        <div className="flex items-center gap-1">
                          {entry.status === "POSTED" && (
                            <Button size="sm" variant="outline" onClick={() => openReachModal(entry)}>
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(entry)}>
                            <span className="text-gray-400">...</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No calendar entries found for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Calendar Entry" size="lg">
        {calendarFormFields}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>Create Entry</Button>
        </div>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingEntry(null); }} title="Edit Calendar Entry" size="lg">
        {calendarFormFields}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingEntry(null); }}>Cancel</Button>
          <Button onClick={handleUpdate} isLoading={saving}>Update Entry</Button>
        </div>
      </Modal>

      <Modal isOpen={reachModalOpen} onClose={() => setReachModalOpen(false)} title={`Post Reach - ${reachEntry?.title || ""}`} size="md">
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
