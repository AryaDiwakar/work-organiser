"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LogOut, Settings as SettingsIcon } from "lucide-react";

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === "SUPER_ADMIN") return -1;
    if (b.role === "SUPER_ADMIN") return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Application settings and user management</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-100">
            <SettingsIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Work Organiser</h2>
            <p className="text-sm text-gray-500">AI-powered Social Media Calendar &amp; Resource Management</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : sortedUsers.length > 0 ? (
                sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        {user.role === "SUPER_ADMIN" && (
                          <Badge variant="danger">SUPER ADMIN</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={
                        user.role === "SUPER_ADMIN" ? "danger" :
                        user.role === "ADMIN" ? "info" : "default"
                      }>
                        {user.role.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No users found.</td>
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
    </div>
  );
}
