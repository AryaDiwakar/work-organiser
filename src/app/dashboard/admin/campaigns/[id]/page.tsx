"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Save, Trash2, Pencil } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CAMPAIGN_TYPE_LABELS, getMetricLabel, getBudgetLabel } from "@/lib/campaigns";

interface DailyData {
  id: string;
  date: string;
  reach: number | null;
  impressions: number | null;
  engagement: number | null;
  sales: number | null;
  appInstalls: number | null;
  inAppPurchases: number | null;
  costPerResult: number | null;
  amountSpent: number | null;
  leads: number | null;
}

interface CampaignLead {
  id: string;
  name: string;
  phone: string | null;
  answers: Record<string, string>;
  createdAt: string;
}

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
  dailyData: DailyData[];
}

function toDateInputValue(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDay(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  d.setDate(d.getDate() + 1);
  return toDateInputValue(d.toISOString());
}

function metricValue(row: DailyData, key: string): number | null {
  const v = (row as unknown as Record<string, number | null>)[key];
  return typeof v === "number" ? v : null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataDate, setDataDate] = useState("");
  const [dataForm, setDataForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DailyData | null>(null);
  const [success, setSuccess] = useState("");
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [leadForm, setLeadForm] = useState<{ id?: string; name: string; phone: string; answers: Record<string, string> }>({ name: "", phone: "", answers: {} });
  const [savingLead, setSavingLead] = useState(false);
  const [leadError, setLeadError] = useState("");

  async function loadCampaign() {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) {
        setError("Failed to load campaign");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCampaign(data);
    } catch {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => setCampaign(data))
      .catch(() => setError("Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !dataDate) return;
    let cancelled = false;
    fetch(`/api/campaigns/${id}/leads?date=${dataDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, dataDate]);

  function initDate() {
    if (!campaign) return "";
    const start = toDateInputValue(campaign.startDate);
    const end = toDateInputValue(campaign.endDate);
    const today = toDateInputValue(new Date().toISOString());
    if (today >= start && today <= end) return today;
    return start;
  }

  function openAddForm() {
    setSuccess("");
    setDataForm({});
    setDataDate(initDate());
    setLeadForm({ name: "", phone: "", answers: {} });
    setLeadError("");
  }

  function handleEditData(row: DailyData) {
    setSuccess("");
    setDataDate(toDateInputValue(row.date));
    const next: Record<string, string> = {};
    for (const key of campaign?.metrics || []) {
      const v = metricValue(row, key);
      next[key] = v != null ? String(v) : "";
    }
    const spent = metricValue(row, "amountSpent");
    next.amountSpent = spent != null ? String(spent) : "";
    const leadsVal = metricValue(row, "leads");
    next.leads = leadsVal != null ? String(leadsVal) : "";
    setDataForm(next);
  }

  async function handleSaveData() {
    if (!campaign || !dataDate) {
      setError("Please select a date");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, string | number | null> = { date: dataDate };
      for (const key of campaign.metrics) {
        const v = dataForm[key]?.trim();
        body[key] = v ? parseFloat(v) : null;
      }
      const spent = dataForm.amountSpent?.trim();
      body.amountSpent = spent ? parseFloat(spent) : null;
      if (campaign.campaignType === "LEADS") {
        const leadsVal = dataForm.leads?.trim();
        body.leads = leadsVal ? parseInt(leadsVal, 10) : null;
      }
      const res = await fetch(`/api/campaigns/${campaign.id}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to save daily data");
        return;
      }
      await loadCampaign();
      setSuccess(`Data saved for ${formatDate(dataDate)}`);
      const next = nextDay(dataDate);
      if (next <= toDateInputValue(campaign.endDate)) {
        setDataDate(next);
      }
      setDataForm({});
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteData(row: DailyData) {
    try {
      const res = await fetch(`/api/campaigns/${campaign?.id}/data?date=${toDateInputValue(row.date)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirm(null);
        setSuccess("");
        await loadCampaign();
      }
    } catch {
      console.error("Failed to delete daily data");
    }
  }

  function resetLeadForm() {
    setLeadForm({ name: "", phone: "", answers: {} });
    setLeadError("");
  }

  function editLead(lead: CampaignLead) {
    setLeadError("");
    setLeadForm({
      id: lead.id,
      name: lead.name,
      phone: lead.phone || "",
      answers: lead.answers || {},
    });
  }

  async function handleSaveLead() {
    if (!campaign || !dataDate) {
      setLeadError("Please select a date");
      return;
    }
    if (!leadForm.name.trim()) {
      setLeadError("Name is required");
      return;
    }
    setSavingLead(true);
    setLeadError("");
    try {
      const body = {
        date: dataDate,
        name: leadForm.name,
        phone: leadForm.phone,
        answers: leadForm.answers,
      };
      const res = await fetch(
        leadForm.id
          ? `/api/campaigns/${campaign.id}/leads/${leadForm.id}`
          : `/api/campaigns/${campaign.id}/leads`,
        {
          method: leadForm.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        setLeadError(errData.error || "Failed to save lead");
        return;
      }
      await fetch(`/api/campaigns/${campaign.id}/leads?date=${dataDate}`)
        .then((r) => r.json())
        .then((data) => setLeads(Array.isArray(data) ? data : []));
      await loadCampaign();
      resetLeadForm();
    } catch {
      setLeadError("Network error");
    } finally {
      setSavingLead(false);
    }
  }

  async function handleDeleteLead(lead: CampaignLead) {
    if (!campaign) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        await loadCampaign();
      }
    } catch {
      console.error("Failed to delete lead");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-red-500 text-center py-12">{error || "Campaign not found."}</p>;
  }

  const start = toDateInputValue(campaign.startDate);
  const end = toDateInputValue(campaign.endDate);
  const totalSpent = campaign.dailyData.reduce((sum, d) => sum + (d.amountSpent || 0), 0);

  const showAmountSpentMetric = !campaign.metrics.includes("amountSpent");
  const formMetrics = campaign.metrics.filter((m) => m !== "amountSpent");
  const baseTableMetrics = showAmountSpentMetric ? [...campaign.metrics, "amountSpent"] : campaign.metrics;
  const isLeadsCampaign = campaign.campaignType === "LEADS";
  const tableMetrics = isLeadsCampaign ? [...baseTableMetrics, "leads"] : baseTableMetrics;
  const leadsQuestions = campaign.leadsForm?.questions || [];

  const daysInCampaign = Math.max(
    1,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const plannedBudget =
    campaign.budgetType === "DAILY" ? (campaign.dailyBudget || 0) * daysInCampaign : campaign.totalBudget || 0;
  const remaining = plannedBudget - totalSpent;

  const metricTotals: Record<string, number> = {};
  for (const key of campaign.metrics) {
    metricTotals[key] = campaign.dailyData.reduce((sum, d) => sum + (metricValue(d, key) || 0), 0);
  }
  if (showAmountSpentMetric) {
    metricTotals.amountSpent = totalSpent;
  }
  if (isLeadsCampaign) {
    metricTotals.leads = campaign.dailyData.reduce((sum, d) => sum + (d.leads || 0), 0);
  }

  const chartMetrics = isLeadsCampaign ? [...campaign.metrics, "leads"] : campaign.metrics;

  const chartData = campaign.dailyData.map((d) => {
    const point: Record<string, string | number | null> = { date: formatDate(d.date) };
    for (const m of campaign.metrics) point[m] = metricValue(d, m);
    if (isLeadsCampaign) point.leads = metricValue(d, "leads");
    return point;
  });

  const typeLabel =
    campaign.campaignType === "OTHERS" && campaign.customType
      ? campaign.customType
      : CAMPAIGN_TYPE_LABELS[campaign.campaignType] || campaign.campaignType;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/admin/campaigns" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-1">
              {campaign.client?.name || "-"} | {typeLabel} | {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </p>
          </div>
          <Badge variant="info">
            {campaign.budgetType === "DAILY"
              ? `₹${(campaign.dailyBudget || 0).toLocaleString()} / day`
              : `₹${(campaign.totalBudget || 0).toLocaleString()} total`}
          </Badge>
        </div>
        {campaign.metrics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {campaign.metrics.map((m) => (
              <span key={m} className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {getMetricLabel(m)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Campaign Budget ({getBudgetLabel(campaign.budgetType)})</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₹{(campaign.budgetType === "DAILY" ? (campaign.dailyBudget || 0) * daysInCampaign : campaign.totalBudget || 0).toLocaleString()}
          </p>
          {campaign.budgetType === "DAILY" && (
            <p className="text-xs text-gray-400 mt-1">₹{(campaign.dailyBudget || 0).toLocaleString()} × {daysInCampaign} days</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-xl font-bold text-red-600 mt-1">₹{totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className={`text-xl font-bold mt-1 ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
            ₹{remaining.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Days Tracked</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{campaign.dailyData.length} / {daysInCampaign}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add / Edit Daily Data</h2>
          <div className="space-y-4">
            <Input
              label="Date *"
              type="date"
              min={start}
              max={end}
              value={dataDate}
              onChange={(e) => setDataDate(e.target.value)}
            />
            {campaign.metrics.length > 0 || showAmountSpentMetric || isLeadsCampaign ? (
              <div className="grid grid-cols-2 gap-4">
                {formMetrics.map((m) => (
                  <Input
                    key={m}
                    label={getMetricLabel(m)}
                    type="number"
                    step="any"
                    value={dataForm[m] || ""}
                    onChange={(e) => setDataForm({ ...dataForm, [m]: e.target.value })}
                    placeholder="0"
                  />
                ))}
                <Input
                  label="Amount Spent (₹)"
                  type="number"
                  step="any"
                  value={dataForm.amountSpent || ""}
                  onChange={(e) => setDataForm({ ...dataForm, amountSpent: e.target.value })}
                  placeholder="0"
                />
                {isLeadsCampaign && (
                  <Input
                    label="Leads (count)"
                    type="number"
                    step="1"
                    min={0}
                    value={dataForm.leads || ""}
                    onChange={(e) => setDataForm({ ...dataForm, leads: e.target.value })}
                    placeholder="0"
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No metrics were selected for this campaign.</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveData} isLoading={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Data
              </Button>
              <Button variant="secondary" onClick={openAddForm}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Daily Data Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Date</th>
                  {tableMetrics.map((m) => (
                    <th key={m} className="px-4 py-2 font-medium">{getMetricLabel(m)}</th>
                  ))}
                  <th className="px-4 py-2 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaign.dailyData.length > 0 ? (
                  campaign.dailyData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900 font-medium whitespace-nowrap">{formatDate(row.date)}</td>
                      {tableMetrics.map((m) => {
                        const v = metricValue(row, m);
                        return (
                          <td key={m} className="px-4 py-2 text-gray-600">
                            {v != null ? v.toLocaleString() : "-"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditData(row)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(row)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={tableMetrics.length + 2} className="px-4 py-8 text-center text-gray-400">
                      No daily data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
              {campaign.dailyData.length > 0 && tableMetrics.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 font-medium text-gray-700">Total</td>
                    {tableMetrics.map((m) => (
                      <td key={m} className="px-4 py-2 font-medium text-gray-900">
                        {metricTotals[m] > 0 ? Number(metricTotals[m]).toLocaleString() : "-"}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {isLeadsCampaign && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Leads</h2>
          <p className="text-sm text-gray-500 mb-5">
            {dataDate ? `Leads for ${formatDate(dataDate)}` : "Select a date above to add leads."}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{leadForm.id ? "Edit Lead" : "Add Lead"}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Name *"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="Lead name"
                  />
                  <Input
                    label="Phone"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                {leadsQuestions.map((q, i) => (
                  <Input
                    key={i}
                    label={q}
                    value={leadForm.answers[q] || ""}
                    onChange={(e) => setLeadForm({ ...leadForm, answers: { ...leadForm.answers, [q]: e.target.value } })}
                    placeholder="Answer"
                  />
                ))}
                {leadError && <p className="text-sm text-red-600">{leadError}</p>}
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveLead} isLoading={savingLead}>
                    {leadForm.id ? "Update Lead" : "Add Lead"}
                  </Button>
                  {leadForm.id && (
                    <Button variant="secondary" onClick={resetLeadForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    {leadsQuestions.map((q, i) => (
                      <th key={i} className="px-4 py-2 font-medium">{q}</th>
                    ))}
                    <th className="px-4 py-2 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.length > 0 ? (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900 font-medium">{lead.name}</td>
                        <td className="px-4 py-2 text-gray-600">{lead.phone || "-"}</td>
                        {leadsQuestions.map((q, i) => (
                          <td key={i} className="px-4 py-2 text-gray-600">{lead.answers?.[q] || "-"}</td>
                        ))}
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => editLead(lead)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={leadsQuestions.length + 3} className="px-4 py-8 text-center text-gray-400">
                        No leads recorded for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h2>
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartMetrics.map((m) => {
              const hasData = chartData.some((p) => (p[m] as number | null) != null);
              if (!hasData) return null;
              return (
                <div key={m} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{getMetricLabel(m)}</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} tickLine={false} />
                        <YAxis fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey={m} name={getMetricLabel(m)} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-12">No performance data yet. Submit daily metrics to see the graph.</p>
        )}
      </div>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete the data for {deleteConfirm ? formatDate(deleteConfirm.date) : ""}?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDeleteData(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
