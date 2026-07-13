"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Key, Trash2, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";

const CREDENTIAL_TYPES = [
  "Server", "Domain", "Admin Panel", "Shopify", "Stripe", "PayPal",
  "Razorpay", "PayU Money", "Facebook", "Instagram", "Gmail",
  "Shippo", "YouTube", "LinkedIn", "Google Places", "Others",
];

interface Credential {
  id: string;
  clientId: string;
  credentialType: string;
  customType: string | null;
  username: string;
  password: string;
  expiryDate: string | null;
  contactPerson: string | null;
  client: { id: string; name: string };
  createdAt: string;
}

interface CredentialForm {
  credentialType: string;
  customType: string;
  username: string;
  password: string;
  expiryDate: string;
  contactPerson: string;
}

const defaultForm: CredentialForm = {
  credentialType: "Server",
  customType: "",
  username: "",
  password: "",
  expiryDate: "",
  contactPerson: "",
};

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays >= 0;
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [forms, setForms] = useState<CredentialForm[]>([{ ...defaultForm }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [editForm, setEditForm] = useState<CredentialForm>(defaultForm);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchCredentials();
    fetchClients();
  }, []);

  async function fetchCredentials() {
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(Array.isArray(data) ? data : []);
      const clientIds = new Set<string>((Array.isArray(data) ? data : []).map((c: Credential) => c.clientId));
      setExpandedClients(clientIds);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
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

  function addForm() {
    setForms([...forms, { ...defaultForm }]);
  }

  function removeForm(index: number) {
    if (forms.length === 1) return;
    setForms(forms.filter((_, i) => i !== index));
  }

  function updateForm(index: number, field: keyof CredentialForm, value: string) {
    const updated = [...forms];
    updated[index] = { ...updated[index], [field]: value };
    setForms(updated);
  }

  async function handleSave() {
    if (!selectedClientId) {
      setError("Please select a client");
      return;
    }
    const validForms = forms.filter((f) => f.username && f.password);
    if (validForms.length === 0) {
      setError("Please fill in at least one credential with username and password");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          credentials: validForms.map((f) => ({
            credentialType: f.credentialType === "Others" ? f.customType : f.credentialType,
            customType: f.credentialType === "Others" ? f.customType : null,
            username: f.username,
            password: f.password,
            expiryDate: f.expiryDate || null,
            contactPerson: f.contactPerson || null,
          })),
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setSelectedClientId("");
        setForms([{ ...defaultForm }]);
        fetchCredentials();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create credentials");
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(cred: Credential) {
    setEditingCredential(cred);
    setEditForm({
      credentialType: CREDENTIAL_TYPES.includes(cred.credentialType) ? cred.credentialType : "Others",
      customType: cred.customType || "",
      username: cred.username,
      password: cred.password,
      expiryDate: cred.expiryDate ? new Date(cred.expiryDate).toISOString().split("T")[0] : "",
      contactPerson: cred.contactPerson || "",
    });
    setEditModalOpen(true);
    setError("");
  }

  async function handleEditSave() {
    if (!editingCredential) return;
    setEditSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/credentials/${editingCredential.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialType: editForm.credentialType === "Others" ? editForm.customType : editForm.credentialType,
          customType: editForm.credentialType === "Others" ? editForm.customType : null,
          username: editForm.username,
          password: editForm.password,
          expiryDate: editForm.expiryDate || null,
          contactPerson: editForm.contactPerson || null,
        }),
      });
      if (res.ok) {
        setEditModalOpen(false);
        setEditingCredential(null);
        fetchCredentials();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update credential");
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this credential?")) return;
    try {
      const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      if (res.ok) fetchCredentials();
    } catch (error) {
      console.error("Failed to delete credential:", error);
    }
  }

  function togglePasswordVisibility(id: string) {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleClient(clientId: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  const grouped = credentials.reduce((acc: Record<string, Credential[]>, cred) => {
    const cid = cred.clientId;
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(cred);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
          <p className="text-gray-500 mt-1">Manage client credentials and access details</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setSelectedClientId(""); setForms([{ ...defaultForm }]); setError(""); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credentials
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Key className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No credentials found. Click "Add Credentials" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([clientId, creds]) => {
            const client = creds[0]?.client;
            const isExpanded = expandedClients.has(clientId);
            const hasExpiryAlert = creds.some((c) => isExpiringSoon(c.expiryDate) || isExpired(c.expiryDate));
            return (
              <div key={clientId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleClient(clientId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    <h3 className="text-lg font-semibold text-gray-900">{client?.name || "Unknown Client"}</h3>
                    <Badge variant="info">{creds.length} credential{creds.length !== 1 ? "s" : ""}</Badge>
                    {hasExpiryAlert && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        Expiry Alert
                      </span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-500">
                          <th className="px-5 py-3 font-medium">Type</th>
                          <th className="px-5 py-3 font-medium">Username / Email</th>
                          <th className="px-5 py-3 font-medium">Password</th>
                          <th className="px-5 py-3 font-medium">Expiry Date</th>
                          <th className="px-5 py-3 font-medium">Contact / OTP</th>
                          <th className="px-5 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {creds.map((cred) => {
                          const expiring = isExpiringSoon(cred.expiryDate);
                          const expired = isExpired(cred.expiryDate);
                          return (
                            <tr key={cred.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {cred.credentialType}
                                  {(expiring || expired) && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${expired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                      <AlertTriangle className="h-3 w-3" />
                                      {expired ? "Expired" : "Expiring Soon"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-gray-600 font-mono text-xs">{cred.username}</td>
                              <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                  <span>{showPasswords[cred.id] ? cred.password : "••••••••"}</span>
                                  <button onClick={() => togglePasswordVisibility(cred.id)} className="text-gray-400 hover:text-gray-600">
                                    {showPasswords[cred.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-gray-600">
                                {cred.expiryDate ? (
                                  <span className={expired ? "text-red-600 font-medium" : expiring ? "text-amber-600 font-medium" : ""}>
                                    {formatDate(cred.expiryDate)}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-xs">{cred.contactPerson || "-"}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditModal(cred)}>
                                    <span className="text-gray-400">...</span>
                                  </Button>
                                  <button
                                    onClick={() => handleDelete(cred.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                    title="Delete credential"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Credentials" size="lg">
        <div className="space-y-4">
          <Select
            label="Select Client"
            options={[{ value: "", label: "Choose a client..." }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          />
          {forms.map((form, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 relative">
              {forms.length > 1 && (
                <button
                  onClick={() => removeForm(index)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <p className="text-xs font-medium text-gray-400 uppercase">Credential {index + 1}</p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Credential Type"
                  options={CREDENTIAL_TYPES.map((t) => ({ value: t, label: t }))}
                  value={form.credentialType}
                  onChange={(e) => updateForm(index, "credentialType", e.target.value)}
                />
                {form.credentialType === "Others" && (
                  <Input
                    label="Custom Type Name"
                    value={form.customType}
                    onChange={(e) => updateForm(index, "customType", e.target.value)}
                    placeholder="Enter credential type"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Username / Email"
                  value={form.username}
                  onChange={(e) => updateForm(index, "username", e.target.value)}
                  placeholder="username or email"
                />
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => updateForm(index, "password", e.target.value)}
                  placeholder="password"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expiry Date (Optional)"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateForm(index, "expiryDate", e.target.value)}
                />
                <Input
                  label="Contact Person / OTP Mobile (Optional)"
                  value={form.contactPerson}
                  onChange={(e) => updateForm(index, "contactPerson", e.target.value)}
                  placeholder="contact details"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addForm} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Credential
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Save Credentials</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingCredential(null); }} title="Edit Credential" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Credential Type"
              options={CREDENTIAL_TYPES.map((t) => ({ value: t, label: t }))}
              value={editForm.credentialType}
              onChange={(e) => setEditForm({ ...editForm, credentialType: e.target.value })}
            />
            {editForm.credentialType === "Others" && (
              <Input
                label="Custom Type Name"
                value={editForm.customType}
                onChange={(e) => setEditForm({ ...editForm, customType: e.target.value })}
                placeholder="Enter credential type"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username / Email"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={editForm.expiryDate}
              onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
            />
            <Input
              label="Contact Person / OTP Mobile (Optional)"
              value={editForm.contactPerson}
              onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingCredential(null); }}>Cancel</Button>
            <Button onClick={handleEditSave} isLoading={editSaving}>Update Credential</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
