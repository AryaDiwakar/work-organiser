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

interface Client {
  id: string;
  name: string;
  website: string | null;
  project: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ClientForm {
  name: string;
  website: string;
  project: string;
}

const defaultForm: ClientForm = { name: "", website: "", project: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingClient(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      website: client.website || "",
      project: client.project || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchClients();
      }
    } catch (error) {
      console.error("Failed to save client:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchClients();
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your clients</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Name</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Website</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Project</th>
                <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Created</th>
                <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/admin/clients/${client.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{client.website || "-"}</td>
                    <td className="px-5 py-3 text-gray-600">{client.project || "-"}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={client.isActive ? "success" : "danger"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(client.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(client)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(client.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No clients found. Click &quot;Add Client&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingClient ? "Edit Client" : "Add Client"} size="lg">
        <div className="space-y-4">
          <Input label="Client Name" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Enter client name" />
          <Input label="Website" id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="e.g. https://client.com" />
          <Input label="Project Working On" id="project" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Social Media Management" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingClient ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <p className="text-gray-600 mb-4">Are you sure you want to delete this client? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
