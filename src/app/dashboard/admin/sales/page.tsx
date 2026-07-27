"use client";
import { useState, useEffect, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const PROJECT_TYPES = [
  "Website",
  "Website Maintenance",
  "Website Enhancement",
  "Social Media",
  "SEO",
  "Branding",
  "Videos",
  "Custom Application",
  "Mobile Application",
  "Others",
];

const SCOPE_STATUS_OPTIONS = [
  { value: "SHARED_TO_CLIENT", label: "Shared to Client" },
  { value: "WAITING_FOR_APPROVAL", label: "Waiting for Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "NOT_APPROVED", label: "Not Approved" },
  { value: "NEEDS_REVISION", label: "Needs Revision" },
];

const SCOPE_STATUS_COLORS: Record<string, string> = {
  SHARED_TO_CLIENT: "info",
  WAITING_FOR_APPROVAL: "warning",
  APPROVED: "success",
  NOT_APPROVED: "danger",
  NEEDS_REVISION: "warning",
};

interface SalesLead {
  id: string;
  dateLeadEntered: string;
  companyName: string;
  referredBy: string | null;
  projectType: string;
  projectDetails: string | null;
  proposedQuote: number | null;
  clientApprovedQuote: number | null;
  scopeStatus: string;
  statusUpdatedDate: string | null;
  clientContactName: string | null;
  clientContactNumber: string | null;
  clientEmail: string | null;
  createdAt: string;
}

interface LeadForm {
  companyName: string;
  referredBy: string;
  projectType: string;
  otherProjectType: string;
  projectDetails: string;
  proposedQuote: string;
  clientApprovedQuote: string;
  scopeStatus: string;
  clientContactName: string;
  clientContactNumber: string;
  clientEmail: string;
}

const defaultForm: LeadForm = {
  companyName: "",
  referredBy: "",
  projectType: "",
  otherProjectType: "",
  projectDetails: "",
  proposedQuote: "",
  clientApprovedQuote: "",
  scopeStatus: "SHARED_TO_CLIENT",
  clientContactName: "",
  clientContactNumber: "",
  clientEmail: "",
};

function getScopeStatusBadge(status: string) {
  const labels: Record<string, string> = {
    SHARED_TO_CLIENT: "Shared to Client",
    WAITING_FOR_APPROVAL: "Waiting for Approval",
    APPROVED: "Approved",
    NOT_APPROVED: "Not Approved",
    NEEDS_REVISION: "Needs Revision",
  };
  const variants: Record<string, "info" | "warning" | "success" | "danger" | "default"> = {
    SHARED_TO_CLIENT: "info",
    WAITING_FOR_APPROVAL: "warning",
    APPROVED: "success",
    NOT_APPROVED: "danger",
    NEEDS_REVISION: "warning",
  };
  return { label: labels[status] || status, variant: variants[status] || ("default" as const) };
}

type SortField = "companyName" | "projectType" | "scopeStatus" | "dateLeadEntered" | "proposedQuote";
type SortDir = "asc" | "desc";

export default function SalesPage() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("dateLeadEntered");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [form, setForm] = useState<LeadForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingLead(null);
    setForm(defaultForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(lead: SalesLead) {
    setEditingLead(lead);
    const isCustomType = !PROJECT_TYPES.includes(lead.projectType);
    setForm({
      companyName: lead.companyName,
      referredBy: lead.referredBy || "",
      projectType: isCustomType ? "Others" : lead.projectType,
      otherProjectType: isCustomType ? lead.projectType : "",
      projectDetails: lead.projectDetails || "",
      proposedQuote: lead.proposedQuote ? String(lead.proposedQuote) : "",
      clientApprovedQuote: lead.clientApprovedQuote ? String(lead.clientApprovedQuote) : "",
      scopeStatus: lead.scopeStatus,
      clientContactName: lead.clientContactName || "",
      clientContactNumber: lead.clientContactNumber || "",
      clientEmail: lead.clientEmail || "",
    });
    setError("");
    setModalOpen(true);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />;
  }

  const filteredLeads = useMemo(() => {
    let result = [...leads];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          l.projectType.toLowerCase().includes(q) ||
          (l.referredBy && l.referredBy.toLowerCase().includes(q)) ||
          (l.clientContactName && l.clientContactName.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "companyName":
          cmp = a.companyName.localeCompare(b.companyName);
          break;
        case "projectType":
          cmp = a.projectType.localeCompare(b.projectType);
          break;
        case "scopeStatus":
          cmp = a.scopeStatus.localeCompare(b.scopeStatus);
          break;
        case "dateLeadEntered":
          cmp = new Date(a.dateLeadEntered).getTime() - new Date(b.dateLeadEntered).getTime();
          break;
        case "proposedQuote":
          cmp = (a.proposedQuote || 0) - (b.proposedQuote || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [leads, search, sortField, sortDir]);

  async function handleSave() {
    if (!form.companyName.trim()) {
      setError("Company name is required");
      return;
    }
    if (!form.projectType) {
      setError("Project type is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        companyName: form.companyName,
        referredBy: form.referredBy,
        projectType: form.projectType === "Others" ? form.otherProjectType : form.projectType,
        projectDetails: form.projectDetails,
        proposedQuote: form.proposedQuote || null,
        clientApprovedQuote: form.clientApprovedQuote || null,
        scopeStatus: form.scopeStatus,
        clientContactName: form.clientContactName,
        clientContactNumber: form.clientContactNumber,
        clientEmail: form.clientEmail,
      };
      const url = editingLead ? `/api/sales/${editingLead.id}` : "/api/sales";
      const method = editingLead ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchLeads();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save lead");
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchLeads();
      }
    } catch (error) {
      console.error("Failed to delete lead:", error);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Leads</h1>
          <p className="text-gray-500 mt-1">Manage your sales pipeline</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by company, type, referrer..."
            className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-sm text-gray-500">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort("dateLeadEntered")} className="flex items-center gap-1 hover:text-gray-700">
                    Date <SortIcon field="dateLeadEntered" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort("companyName")} className="flex items-center gap-1 hover:text-gray-700">
                    Company <SortIcon field="companyName" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Referred By</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort("projectType")} className="flex items-center gap-1 hover:text-gray-700">
                    Project Type <SortIcon field="projectType" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort("proposedQuote")} className="flex items-center gap-1 hover:text-gray-700">
                    Quote <SortIcon field="proposedQuote" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort("scopeStatus")} className="flex items-center gap-1 hover:text-gray-700">
                    Status <SortIcon field="scopeStatus" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Contact</th>
                <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const badge = getScopeStatusBadge(lead.scopeStatus);
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(lead.dateLeadEntered)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.referredBy || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.projectType}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {lead.proposedQuote ? `₹${lead.proposedQuote.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {lead.clientContactName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(lead)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(lead.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {search ? "No leads match your search." : "No leads found. Click \"Add Lead\" to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? "Edit Lead" : "Add Lead"} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
              placeholder="Enter company name"
            />
            <Input
              label="Referred By"
              value={form.referredBy}
              onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
              placeholder="Enter referrer name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Project Type *"
              options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
              value={form.projectType}
              onChange={(e) => setForm({ ...form, projectType: e.target.value })}
              placeholder="Select project type"
            />
            {form.projectType === "Others" && (
              <Input
                label="Specify Project Type *"
                value={form.otherProjectType}
                onChange={(e) => setForm({ ...form, otherProjectType: e.target.value })}
                placeholder="Enter custom project type"
              />
            )}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Details / Remarks</label>
            <textarea
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.projectDetails}
              onChange={(e) => setForm({ ...form, projectDetails: e.target.value })}
              placeholder="Enter project details or remarks"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Proposed Quote (₹)"
              type="number"
              value={form.proposedQuote}
              onChange={(e) => setForm({ ...form, proposedQuote: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Client Approved Quote (₹)"
              type="number"
              value={form.clientApprovedQuote}
              onChange={(e) => setForm({ ...form, clientApprovedQuote: e.target.value })}
              placeholder="0"
            />
            <Select
              label="Scope Status"
              options={SCOPE_STATUS_OPTIONS}
              value={form.scopeStatus}
              onChange={(e) => setForm({ ...form, scopeStatus: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Client Contact Name"
              value={form.clientContactName}
              onChange={(e) => setForm({ ...form, clientContactName: e.target.value })}
              placeholder="Contact person name"
            />
            <Input
              label="Client Contact Number"
              value={form.clientContactNumber}
              onChange={(e) => setForm({ ...form, clientContactNumber: e.target.value })}
              placeholder="Phone number"
            />
            <Input
              label="Client Email"
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingLead ? "Update" : "Create"} Lead</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <p className="text-gray-600 mb-4">Are you sure you want to delete this lead? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
