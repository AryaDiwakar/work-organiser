"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Edit2, Power, PowerOff } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ResourceForm {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}

const defaultForm: ResourceForm = { name: "", email: "", password: "", role: "RESOURCE", phone: "" };

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "RESOURCE", label: "Resource" },
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setResources(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingResource(null);
    setForm(defaultForm);
    setPasswordRequired(true);
    setModalOpen(true);
  }

  function openEditModal(resource: Resource) {
    setEditingResource(resource);
    setForm({
      name: resource.name,
      email: resource.email,
      password: "",
      role: resource.role,
      phone: resource.phone || "",
    });
    setPasswordRequired(false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (passwordRequired && !form.password.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || null,
      };
      if (form.password) body.password = form.password;

      const url = editingResource ? `/api/users/${editingResource.id}` : "/api/users";
      const method = editingResource ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchResources();
      }
    } catch (error) {
      console.error("Failed to save resource:", error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(resource: Resource) {
    try {
      await fetch(`/api/users/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !resource.isActive }),
      });
      fetchResources();
    } catch (error) {
      console.error("Failed to toggle status:", error);
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
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-500 mt-1">Manage team resources</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {resources.length > 0 ? (
                resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{resource.name}</td>
                    <td className="px-5 py-3 text-gray-600">{resource.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={
                        resource.role === "SUPER_ADMIN" ? "danger" :
                        resource.role === "ADMIN" ? "info" : "default"
                      }>
                        {resource.role.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={resource.isActive ? "success" : "danger"}>
                        {resource.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(resource.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(resource)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(resource)}>
                          {resource.isActive
                            ? <PowerOff className="h-4 w-4 text-red-500" />
                            : <Power className="h-4 w-4 text-green-500" />
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No resources found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingResource ? "Edit Resource" : "Add Resource"} size="lg">
        <div className="space-y-4">
          <Input label="Name" id="resName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" id="resEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input
            label="Password"
            id="resPassword"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={passwordRequired}
            placeholder={editingResource ? "Leave blank to keep current" : ""}
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <Input label="Phone" id="resPhone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingResource ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
