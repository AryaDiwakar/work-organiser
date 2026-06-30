"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "lucide-react";

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  postingDate: string;
  status: string;
  assignedUser: { id: string; name: string } | null;
}

export default function ResourceCalendarPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const now = new Date();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchEntries();
  }, [startDate, endDate, userId]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ assignedTo: userId });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
        <p className="text-gray-500 mt-1">View your assigned tasks by month.</p>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-44">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span className="text-gray-400 pb-2">to</span>
        <div className="w-44">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Assigned Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Posting Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : entries.length > 0 ? (
                entries.map((entry) => {
                  const sla = getSLAStatus({
                    status: entry.status,
                    postingDate: new Date(entry.postingDate),
                  });
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{entry.title}</td>
                      <td className="px-5 py-3 text-gray-600">{entry.client?.name || "-"}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(new Date(entry.postingDate))}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          sla.color === "🔴" ? "bg-red-100 text-red-700" :
                          sla.color === "🟡" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {sla.color} {sla.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No tasks assigned to you for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
