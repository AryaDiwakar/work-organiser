"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Eye, Edit2, Trash2 } from "lucide-react";
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_LABELS, METRICS, getMetricLabel } from "@/lib/campaigns";

interface Campaign {
  id: string;
  name: string;
  client: { id: string; name: string } | null;
  campaignType: string;
  customType: string | null;
  startDate: string;
  endDate: string;
  budgetType: string;
  dailyBudget: number | null;
  totalBudget: number | null;
  metrics: string[];
  leadsForm?: { questions?: string[] };
  createdAt: string;
}

interface CampaignForm {
  clientId: string;
  name: string;
  campaignType: string;
  customType: string;
  startDate: string;
  endDate: string;
  budgetType: string;
  dailyBudget: string;
  totalBudget: string;
  metrics: string[];
  leadsFormQuestions: string[];
}

const defaultForm: CampaignForm = {
  clientId: "",
  name: "",
  campaignType: "",
  customType: "",
  startDate: "",
  endDate: "",
  budgetType: "DAILY",
  dailyBudget: "",
  totalBudget: "",
  metrics: [],
  leadsFormQuestions: [],
};

function toDateInputValue(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCampaignBadge(type: string) {
  const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    AWARENESS: "info",
    TRAFFIC: "default",
    GOOGLE_ADS: "success",
    GOOGLE_SHOPPING: "success",
    SALES: "warning",
    ENGAGEMENT: "info",
    LEADS: "warning",
    APP_PROMOTION: "danger",
    OTHERS: "default",
  };
  return variants[type] || "default";
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
  }, []);

  const filterCampaignOptions = campaigns.map((c) => ({ value: c.id, label: c.name }));
  const filterClientOptions = Array.from(
    new Map(
      campaigns.filter((c) => c.client).map((c) => [c.client!.id, { value: c.client!.id, label: c.client!.name }])
    ).values()
  );

  const filteredCampaigns = campaigns.filter((c) => {
    if (campaignFilter && c.id !== campaignFilter) return false;
    if (clientFilter && c.client?.id !== clientFilter) return false;
    if (startDateFilter && toDateInputValue(c.endDate) < startDateFilter) return false;
    if (endDateFilter && toDateInputValue(c.startDate) > endDateFilter) return false;
    return true;
  });

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
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

  function openAddModal() {
    setEditingCampaign(null);
    setForm(defaultForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(campaign: Campaign) {
    setEditingCampaign(campaign);
    setForm({
      clientId: campaign.client?.id || "",
      name: campaign.name,
      campaignType: campaign.campaignType,
      customType: campaign.customType || "",
      startDate: toDateInputValue(campaign.startDate),
      endDate: toDateInputValue(campaign.endDate),
      budgetType: campaign.budgetType,
      dailyBudget: campaign.dailyBudget != null ? String(campaign.dailyBudget) : "",
      totalBudget: campaign.totalBudget != null ? String(campaign.totalBudget) : "",
      metrics: campaign.metrics || [],
      leadsFormQuestions: campaign.leadsForm?.questions || [],
    });
    setError("");
    setModalOpen(true);
  }

  function addLeadsQuestion() {
    setForm((prev) => ({ ...prev, leadsFormQuestions: [...prev.leadsFormQuestions, ""] }));
  }

  function updateLeadsQuestion(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.leadsFormQuestions];
      next[index] = value;
      return { ...prev, leadsFormQuestions: next };
    });
  }

  function removeLeadsQuestion(index: number) {
    setForm((prev) => ({
      ...prev,
      leadsFormQuestions: prev.leadsFormQuestions.filter((_, i) => i !== index),
    }));
  }

  function toggleMetric(metric: string) {
    setForm((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (!form.clientId) {
      setError("Client is required");
      return;
    }
    if (!form.campaignType) {
      setError("Campaign type is required");
      return;
    }
    if (form.campaignType === "OTHERS" && !form.customType.trim()) {
      setError("Specify the custom campaign type");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date must be on or after start date");
      return;
    }
    if (form.budgetType === "DAILY" && !form.dailyBudget) {
      setError("Daily budget is required");
      return;
    }
    if (form.budgetType === "TOTAL" && !form.totalBudget) {
      setError("Total budget is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        clientId: form.clientId,
        name: form.name,
        campaignType: form.campaignType,
        customType: form.customType,
        startDate: form.startDate,
        endDate: form.endDate,
        budgetType: form.budgetType,
        dailyBudget: form.budgetType === "DAILY" ? form.dailyBudget : null,
        totalBudget: form.budgetType === "TOTAL" ? form.totalBudget : null,
        metrics: form.metrics,
        leadsFormQuestions: form.leadsFormQuestions,
      };
      const url = editingCampaign ? `/api/campaigns/${editingCampaign.id}` : "/api/campaigns";
      const method = editingCampaign ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchCampaigns();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save campaign");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
  }

  function budgetLabel(c: Campaign): string {
    if (c.budgetType === "DAILY" && c.dailyBudget != null) {
      return `₹${c.dailyBudget.toLocaleString()} / day`;
    }
    if (c.budgetType === "TOTAL" && c.totalBudget != null) {
      return `₹${c.totalBudget.toLocaleString()} total`;
    }
    return "-";
  }

  function typeLabel(c: Campaign): string {
    if (c.campaignType === "OTHERS" && c.customType) return c.customType;
    return CAMPAIGN_TYPE_LABELS[c.campaignType] || c.campaignType;
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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage social media and paid campaigns</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Campaign
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="w-56">
          <Select
            options={[
              { value: "", label: "All Campaigns" },
              ...filterCampaignOptions,
            ]}
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            options={[
              { value: "", label: "All Clients" },
              ...filterClientOptions,
            ]}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
        </div>
        {(campaignFilter || clientFilter || startDateFilter || endDateFilter) && (
          <button
            onClick={() => {
              setCampaignFilter("");
              setClientFilter("");
              setStartDateFilter("");
              setEndDateFilter("");
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 pb-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Metrics</th>
                <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-4 py-3 text-gray-600">{campaign.client?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getCampaignBadge(campaign.campaignType)}>{typeLabel(campaign)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{budgetLabel(campaign)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {(campaign.metrics || []).length > 0 ? (
                        <span className="line-clamp-1">{campaign.metrics.map(getMetricLabel).join(", ")}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/admin/campaigns/${campaign.id}`}>
                          <Button variant="ghost" size="sm" title="Daily data">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(campaign)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(campaign.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {campaigns.length > 0
                      ? "No campaigns match the current filters."
                      : "No campaigns found. Click \"Add Campaign\" to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCampaign ? "Edit Campaign" : "Add Campaign"} size="xl">
        <div className="space-y-4">
          <Select
            label="Client *"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            placeholder="Select client"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Campaign Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Product Launch - Awareness"
            />
            <Select
              label="Campaign Type *"
              options={CAMPAIGN_TYPES.map((t) => ({ value: t, label: CAMPAIGN_TYPE_LABELS[t] }))}
              value={form.campaignType}
              onChange={(e) => setForm({ ...form, campaignType: e.target.value })}
              placeholder="Select campaign type"
            />
          </div>
          {form.campaignType === "OTHERS" && (
            <Input
              label="Specify Campaign Type *"
              value={form.customType}
              onChange={(e) => setForm({ ...form, customType: e.target.value })}
              placeholder="Enter custom campaign type"
            />
          )}
          {form.campaignType === "LEADS" && (
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Leads Form Questions</label>
              <p className="text-xs text-gray-500 mb-3">
                Name and Phone are included by default. Add the questions to ask for each lead (e.g. Question 1, Question 2).
              </p>
              <div className="space-y-2">
                {form.leadsFormQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={q}
                      onChange={(e) => updateLeadsQuestion(i, e.target.value)}
                      placeholder={`Question ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLeadsQuestion(i)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 shrink-0"
                      title="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLeadsQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date *" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Budget</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="budgetType"
                  checked={form.budgetType === "DAILY"}
                  onChange={() => setForm({ ...form, budgetType: "DAILY" })}
                  className="accent-indigo-600"
                />
                Daily
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="budgetType"
                  checked={form.budgetType === "TOTAL"}
                  onChange={() => setForm({ ...form, budgetType: "TOTAL" })}
                  className="accent-indigo-600"
                />
                Total
              </label>
            </div>
            {form.budgetType === "DAILY" ? (
              <Input
                label="Per Day Budget (₹) *"
                type="number"
                value={form.dailyBudget}
                onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })}
                placeholder="0"
              />
            ) : (
              <Input
                label="Total Budget (₹) *"
                type="number"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                placeholder="0"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Daily Data to Track</label>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((m) => (
                <label
                  key={m.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    form.metrics.includes(m.key)
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.metrics.includes(m.key)}
                    onChange={() => toggleMetric(m.key)}
                    className="accent-indigo-600"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingCampaign ? "Update" : "Create"} Campaign</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <p className="text-gray-600 mb-4">Are you sure you want to delete this campaign and all its daily data? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
