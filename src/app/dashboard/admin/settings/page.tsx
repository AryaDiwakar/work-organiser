"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, LogOut, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "RESOURCE", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session && !isSuperAdmin) {
      router.push("/dashboard/admin");
    }
  }, [session]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  }

  async function handleAddUser() {
    if (!addForm.name || !addForm.email || !addForm.password) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setAddModalOpen(false);
        setAddForm({ name: "", email: "", password: "", role: "RESOURCE", phone: "" });
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setSaving(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Only super admin can access settings.</p>
      </div>
    );
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === "SUPER_ADMIN") return -1;
    if (b.role === "SUPER_ADMIN") return 1;
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">User management &amp; application settings</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : sortedUsers.length > 0 ? (
                sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        {user.role === "SUPER_ADMIN" && <Badge variant="danger">SUPER ADMIN</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={user.role === "SUPER_ADMIN" ? "danger" : user.role === "ADMIN" ? "info" : "default"}>
                        {user.role.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleUserStatus(user)} title={user.isActive ? "Deactivate" : "Activate"}>
                        {user.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Session</h2>
        <p className="text-sm text-gray-500 mb-4">
          Logged in as <strong>{session?.user?.name}</strong> ({session?.user?.email})
        </p>
        <Button variant="danger" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Resource" size="md">
        <div className="space-y-4">
          <Input label="Name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required placeholder="Full name" />
          <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required placeholder="email@example.com" />
          <Input label="Password" type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required placeholder="Min 6 characters" />
          <Input label="Phone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Optional" />
          <Select label="Role" options={[{ value: "RESOURCE", label: "Resource" }, { value: "ADMIN", label: "Admin" }]} value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} isLoading={saving}>Add User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
