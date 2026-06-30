"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  status: string;
  appliedAt: string;
  isRed: boolean;
  permissionHours: number | null;
  rejectionReason: string | null;
  user: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string } | null;
}

export default function LeaveManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    if (session && !isSuperAdmin) {
      router.push("/dashboard/admin");
    }
  }, [session]);

  useEffect(() => {
    fetchLeaves();
  }, [filter, typeFilter]);

  async function fetchLeaves() {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/leave?${params}`);
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, status: string, rejectionReason?: string) {
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (res.ok) fetchLeaves();
    } catch (error) {
      console.error("Failed to update leave:", error);
    }
  }

  if (!isSuperAdmin) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-gray-500">Only super admin can manage leave requests.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave &amp; Permission Requests</h1>
          <p className="text-gray-500 mt-1">Approve or deny resource requests</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {["pending", "approved", "denied", ""].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f ? "bg-indigo-100 text-indigo-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["", "leave", "permission"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                typeFilter === t ? "bg-indigo-100 text-indigo-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t ? t.charAt(0).toUpperCase() + t.slice(1) : "All Types"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Resource</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Start</th>
                <th className="px-5 py-3 font-medium">End</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Applied</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : leaves.length > 0 ? (
                leaves.map((leave) => {
                  const start = new Date(leave.startDate);
                  const end = new Date(leave.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <tr key={leave.id} className={`hover:bg-gray-50 ${leave.isRed ? "bg-red-50" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{leave.user.name}</div>
                        <div className="text-xs text-gray-500">{leave.user.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={leave.type === "permission" ? "info" : "warning"}>
                          {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}
                          {leave.permissionHours ? ` (${leave.permissionHours}h)` : ""}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-gray-600">{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        {leave.type === "permission" ? `${leave.permissionHours || 0}h` : `${days} day${days > 1 ? "s" : ""}`}
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{leave.reason || "-"}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDateTime(leave.appliedAt)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={leave.status === "approved" ? "success" : leave.status === "denied" ? "danger" : "warning"}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {leave.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAction(leave.id, "approved")}>Approve</Button>
                            <Button variant="danger" size="sm" onClick={() => {
                              const reason = prompt("Rejection reason (optional):");
                              handleAction(leave.id, "denied", reason || undefined);
                            }}>Deny</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {leave.approvedBy ? `by ${leave.approvedBy.name}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-400">No requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
