"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface CalendarEntry {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  postingDate: string;
  status: string;
  assignedUser: { id: string; name: string } | null;
}

export default function ResourceDashboardPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [tasks, setTasks] = useState<CalendarEntry[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const now = new Date();
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      const [tasksRes, upcomingRes] = await Promise.all([
        fetch(`/api/calendar?assignedTo=${userId}`),
        fetch(`/api/calendar?assignedTo=${userId}`),
      ]);
      const tasksData = await tasksRes.json();
      const allTasks: CalendarEntry[] = Array.isArray(tasksData) ? tasksData : tasksData.data || [];

      setTasks(allTasks);
      setUpcoming(
        allTasks.filter((t) => {
          const d = new Date(t.postingDate);
          return d >= now && d <= weekLater;
        })
      );
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkComplete(entryId: string) {
    setCompleting(entryId);
    try {
      const res = await fetch(`/api/calendar/${entryId}/complete`, { method: "POST" });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error("Failed to mark complete:", error);
    } finally {
      setCompleting(null);
    }
  }

  function canMarkComplete(status: string) {
    return !["POSTED", "APPROVED", "SCHEDULED"].includes(status);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || "Resource"}
        </h1>
        <p className="text-gray-500 mt-1">Here are your assigned tasks and upcoming deadlines.</p>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-3">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Upcoming Deadlines (Next 7 Days)</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">
                    {t.client?.name || "-"} &middot; {formatDate(new Date(t.postingDate))}
                  </p>
                </div>
                <Badge variant="warning">{getStatusLabel(t.status)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
          </div>
          <span className="text-sm text-gray-500">{tasks.length} entries</span>
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
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.length > 0 ? (
                tasks.map((entry) => {
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
                      <td className="px-5 py-3 text-lg">{sla.color}</td>
                      <td className="px-5 py-3">
                        {canMarkComplete(entry.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={completing === entry.id}
                            onClick={() => handleMarkComplete(entry.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No tasks assigned to you yet.
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
