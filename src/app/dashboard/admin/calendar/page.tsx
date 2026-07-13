"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatDuration, getStatusLabel, getStatusColor, getSLAStatus, isAdminRole } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, BarChart3, Download, Clock, ClipboardList } from "lucide-react";
import { TimeLogModal } from "@/components/ui/TimeLogModal";
import * as XLSX from "xlsx";

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
  storyboardCompletedDate: string | null;
  designedDate: string | null;
  sharedToClientDate: string | null;
  approvalDate: string | null;
  internalFeedbackDate: string | null;
  clientFeedbackDate: string | null;
  schedulingDate: string | null;
  postedDate: string | null;
  rejectedDate: string | null;
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
  assignedToMulti: string[];
}

const defaultForm: CalendarForm = {
  title: "", clientId: "", categoryId: "", postType: "POSTER",
  platforms: [], creativeBrief: "", caption: "", hashtags: "",
  designDirection: "", referenceLinks: "", postingDate: "", postingTime: "",
  assignedTo: "", assignedToMulti: [],
};

const POST_TYPES_MULTI_RESOURCE = ["REEL", "VIDEO"];

function getStatusDate(entry: CalendarEntry): string | null {
  switch (entry.status) {
    case "STORYBOARD_COMPLETED": return entry.storyboardCompletedDate;
    case "DESIGNED": return entry.designedDate;
    case "SHARED_TO_CLIENT": return entry.sharedToClientDate;
    case "APPROVED": return entry.approvalDate;
    case "INTERNAL_FEEDBACK": return entry.internalFeedbackDate;
    case "CLIENT_FEEDBACK": return entry.clientFeedbackDate;
    case "SCHEDULED": return entry.schedulingDate;
    case "POSTED": return entry.postedDate;
    case "REJECTED": return entry.rejectedDate;
    default: return null;
  }
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role as string);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [clientFilter, setClientFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role?: string }[]>([]);
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
  const [timerTotals, setTimerTotals] = useState<Record<string, number>>({});
  const [workDate, setWorkDate] = useState("");
  const [activeCalendarIds, setActiveCalendarIds] = useState<string[] | null>(null);
  const [activeAdhocIds, setActiveAdhocIds] = useState<string[]>([]);
  const [adhocTasks, setAdhocTasks] = useState<{ id: string; title: string; description: string | null; deadline: string | null; status: string; client: { id: string; name: string } | null; assignedUser: { id: string; name: string } | null }[]>([]);
  const [adhocTimerTotals, setAdhocTimerTotals] = useState<Record<string, number>>({});
  const [timeLogModal, setTimeLogModal] = useState<{ taskType: string; taskId: string; title: string } | null>(null);

  const displayEntries = workDate && activeCalendarIds !== null
    ? entries.filter((e) => activeCalendarIds.includes(e.id))
    : entries;

  useEffect(() => {
    fetchEntries();
    fetchClients();
    fetchUsers();
    fetchCategories();
  }, [startDate, endDate, clientFilter, resourceFilter]);

  useEffect(() => {
    if (workDate) {
      fetch(`/api/time-tracker/active-tasks?date=${workDate}`)
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
  }, [workDate]);

  useEffect(() => {
    if (activeAdhocIds.length > 0) {
      fetch(`/api/tasks?ids=${activeAdhocIds.join(",")}`)
        .then((r) => r.json())
        .then((data) => setAdhocTasks(Array.isArray(data) ? data : data.data || []))
        .catch(() => setAdhocTasks([]));
    } else {
      setAdhocTasks([]);
    }
  }, [activeAdhocIds]);

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

  async function fetchEntries() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (clientFilter) params.set("clientId", clientFilter);
      if (resourceFilter) params.set("assignedTo", resourceFilter);
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

  const isMultiResource = POST_TYPES_MULTI_RESOURCE.includes(form.postType);

  function toggleMultiResource(resourceId: string) {
    setForm((prev) => ({
      ...prev,
      assignedToMulti: prev.assignedToMulti.includes(resourceId)
        ? prev.assignedToMulti.filter((id) => id !== resourceId)
        : [...prev.assignedToMulti, resourceId],
    }));
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
      assignedToMulti: [],
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
        assignedTo: undefined as string | undefined,
        assignedToMulti: isMultiResource ? form.assignedToMulti : [],
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

  async function openReachModal(entry: CalendarEntry) {
    setReachEntry(entry);
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
    if (!reachEntry) return;
    setSavingReach(true);
    setError("");
    try {
      const body: Record<string, any> = { calendarEntryId: reachEntry.id };
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
        setError(errData.error || "Failed to save reach");
        return;
      }
      setReachModalOpen(false);
    } catch (error) {
      setError("Network error");
      console.error("Failed to save reach:", error);
    } finally {
      setSavingReach(false);
    }
  }

  function downloadExcel() {
    const data = entries.map((e) => ({
      Title: e.title,
      Client: e.client?.name || "-",
      Category: e.category?.name || "-",
      Type: e.postType,
      Platform: e.platform?.join(", ") || "-",
      "Posting Date": formatDate(e.postingDate),
      "Posting Time": e.postingTime || "-",
      "Assigned To": e.assignedUser?.name || "-",
      Status: getStatusLabel(e.status),
      "Marked Date": getStatusDate(e) ? formatDate(getStatusDate(e)!) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calendar");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendar_${startDate || "all"}_to_${endDate || "all"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
        {isMultiResource ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To Resources</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {users.filter((u) => u.role !== "SUPER_ADMIN").map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleMultiResource(u.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    form.assignedToMulti.includes(u.id)
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Select label="Assigned To" options={[{ value: "", label: "Unassigned" }, ...users.filter((u) => u.role !== "SUPER_ADMIN").map((u) => ({ value: u.id, label: u.name }))]} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
        )}
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
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-44">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="w-56">
          <Select
            options={[
              { value: "", label: "All Resources" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          />
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
        <div className="w-44">
          <Input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            placeholder="Filter by work date"
          />
          {workDate && (
            <button
              onClick={() => setWorkDate("")}
              className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
            >
              Clear work date
            </button>
          )}
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
                <th className="px-4 py-3 font-medium">Marked Date</th>
                <th className="px-4 py-3 font-medium">SLA</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className="inline-flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                    </div>
                  </td>
                </tr>
              ) : displayEntries.length > 0 ? (
                displayEntries.map((entry) => {
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
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {getStatusDate(entry) ? formatDate(getStatusDate(entry)!) : "-"}
                      </td>
                      <td className="px-4 py-3 text-lg">{sla.color}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {formatDuration(timerTotals[entry.id] || 0)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTimeLogModal({ taskType: "CALENDAR", taskId: entry.id, title: entry.title })}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                            title="View time logs"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
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
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                    {workDate ? "No calendar entries with activity on this date." : "No calendar entries found for this month."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {workDate && adhocTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Adhoc Tasks Worked On</h2>
            <span className="text-sm text-gray-500 ml-auto">{adhocTasks.length} tasks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Assigned To</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adhocTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-gray-600">{task.client?.name || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{task.assignedUser?.name || "Unassigned"}</td>
                    <td className="px-4 py-3 text-gray-600">{task.deadline ? formatDate(task.deadline) : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "info" : "default"}>
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {formatDuration(adhocTimerTotals[task.id] || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setTimeLogModal({ taskType: "ADHOC", taskId: task.id, title: task.title })}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                        title="View time logs"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      <TimeLogModal
        isOpen={!!timeLogModal}
        onClose={() => setTimeLogModal(null)}
        taskType={timeLogModal?.taskType || ""}
        taskId={timeLogModal?.taskId || ""}
        taskTitle={timeLogModal?.title || ""}
      />
    </div>
  );
}
