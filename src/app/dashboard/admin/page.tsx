"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getStatusLabel, getStatusColor, getSLAStatus, formatDuration } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Users, Calendar, UserCheck, AlertTriangle, KeyRound, FileText, BarChart3, ClipboardList, Layers } from "lucide-react";

type Period = "this" | "last";

function periodRange(period: Period) {
  const now = new Date();
  const monthsAgo = period === "last" ? 1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const mm = (m: number) => String(m).padStart(2, "0");
  const startDate = `${start.getFullYear()}-${mm(start.getMonth() + 1)}-01`;
  const endDate = `${end.getFullYear()}-${mm(end.getMonth() + 1)}-${mm(end.getDate())}`;
  return {
    month: start.getMonth() + 1,
    year: start.getFullYear(),
    startDate,
    endDate,
    label: start.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";
  const [period, setPeriod] = useState<Period>("this");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalCalendarEntries: 0,
    activeResources: 0,
    overdueTasks: 0,
  });

  const [entries, setEntries] = useState<any[]>([]);
  const [clientSummary, setClientSummary] = useState<any>(null);
  const [postReport, setPostReport] = useState<any>(null);
  const [resourceSummary, setResourceSummary] = useState<any>(null);
  const [clientWork, setClientWork] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);

  const [clientWorkClientId, setClientWorkClientId] = useState("");
  const [postClientId, setPostClientId] = useState("");
  const [csClientId, setCsClientId] = useState("");
  const [resourceUserId, setResourceUserId] = useState("");

  const range = periodRange(period);

  const reportClients = (clientSummary?.clients || []).map((c: any) => ({ value: c.clientId, label: c.clientName }));
  const reportResources = (resourceSummary?.report || []).map((r: any) => ({ value: r.userId, label: r.name }));

  useEffect(() => {
    setLoading(true);
    setClientWorkClientId("");
    setPostClientId("");
    setCsClientId("");
    setResourceUserId("");
    setClientWork(null);
    Promise.all([fetchEntries(), fetchClientSummary(), fetchResourceSummary(), fetchPostReport()]).finally(() => setLoading(false));
    if (isSuperAdmin) fetchCredentials();
  }, [period, isSuperAdmin]);

  async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url);
    return res.json();
  }

  async function fetchEntries() {
    try {
      const data = await fetchJson(`/api/calendar?month=${range.month}&year=${range.year}`);
      setEntries(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch calendar entries:", error);
    }
  }

  async function fetchClientSummary(clientId?: string) {
    try {
      const params = new URLSearchParams({ month: String(range.month), year: String(range.year) });
      if (clientId) params.set("clientId", clientId);
      const data = await fetchJson(`/api/reports/client-summary?${params}`);
      setClientSummary(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch client summary:", error);
      return null;
    }
  }

  async function fetchResourceSummary(userId?: string) {
    try {
      const params = new URLSearchParams({ month: String(range.month), year: String(range.year) });
      if (userId) params.set("userId", userId);
      const data = await fetchJson(`/api/reports/resource-summary?${params}`);
      setResourceSummary(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch resource summary:", error);
      return null;
    }
  }

  async function fetchPostReport(clientId?: string) {
    try {
      const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
      if (clientId) params.set("clientId", clientId);
      const data = await fetchJson(`/api/reports/post-status?${params}`);
      setPostReport(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch post status report:", error);
      return null;
    }
  }

  async function fetchClientWork(clientId: string) {
    try {
      const params = new URLSearchParams({ clientId, month: String(range.month), year: String(range.year) });
      const data = await fetchJson(`/api/reports?${params}`);
      setClientWork(data);
    } catch (error) {
      console.error("Failed to fetch client work:", error);
      setClientWork(null);
    }
  }

  async function fetchCredentials() {
    try {
      const data = await fetchJson("/api/credentials");
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    }
  }

  async function fetchDashboardStats() {
    try {
      const [clientsRes, usersRes, tasksRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/users"),
        fetch("/api/tasks"),
      ]);
      const clients = await clientsRes.json();
      const users = await usersRes.json();
      const tasks = await tasksRes.json();
      const clientsData = Array.isArray(clients) ? clients : clients.data || [];
      const usersData = Array.isArray(users) ? users : users.data || [];
      const tasksData = Array.isArray(tasks) ? tasks : tasks.data || [];
      const statusCounts: Record<string, number> = {};
      entries.forEach((entry: any) => {
        statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
      });
      const now = new Date();
      setStats({
        totalClients: clientsData.length,
        totalCalendarEntries: entries.length,
        activeResources: usersData.filter((u: any) => u.isActive && u.role === "RESOURCE").length,
        overdueTasks: tasksData.filter((t: any) => {
          if (t.status === "COMPLETED" || t.status === "NOT_APPLICABLE") return false;
          return t.deadline && new Date(t.deadline) < now;
        }).length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  }

  useEffect(() => {
    fetchDashboardStats();
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleClientWorkChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setClientWorkClientId(v);
    if (!v) {
      setClientWork(null);
      return;
    }
    fetchClientWork(v);
  };

  const handlePostClientChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setPostClientId(v);
    fetchPostReport(v || undefined);
  };

  const handleClientSummaryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setCsClientId(v);
    fetchClientSummary(v || undefined);
  };

  const handleResourceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setResourceUserId(v);
    fetchResourceSummary(v || undefined);
  };

  const statusCounts: Record<string, number> = {};
  entries.forEach((entry: any) => {
    statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
  });
  const postsByStatus = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const slaBuckets = { on_track: 0, warning: 0, overdue: 0 };
  entries.forEach((entry: any) => {
    const s = getSLAStatus(entry);
    if (s.color === "🟢") slaBuckets.on_track += 1;
    else if (s.color === "🟡") slaBuckets.warning += 1;
    else slaBuckets.overdue += 1;
  });
  const slaDistribution = [
    { name: "On Track", value: slaBuckets.on_track },
    { name: "Warning", value: slaBuckets.warning },
    { name: "Overdue", value: slaBuckets.overdue },
  ].filter((d) => d.value > 0);

  const monthStart = new Date(range.year, range.month - 1, 1);
  const monthEnd = new Date(range.year, range.month, 0, 23, 59, 59, 999);
  const expiringCredentials = credentials.filter((c: any) => {
    if (!c.expiryDate) return false;
    const exp = new Date(c.expiryDate);
    return exp >= monthStart && exp <= monthEnd;
  });

  const reportCards = [
    {
      id: "postsByStatus",
      title: `Posts by Status (${range.label})`,
      icon: BarChart3,
    },
    {
      id: "sla",
      title: `SLA Status Distribution (${range.label})`,
      icon: Layers,
    },
    {
      id: "clientWork",
      title: `Client Work Report (${range.label})`,
      icon: FileText,
    },
    {
      id: "postStatus",
      title: `Post Status Report (${range.label})`,
      icon: ClipboardList,
    },
    {
      id: "clientSummary",
      title: `Client-wise Summary (${range.label})`,
      icon: Users,
    },
    {
      id: "resourceSummary",
      title: `Resource-wise Summary (${range.label})`,
      icon: UserCheck,
    },
    {
      id: "credentials",
      title: `Credentials Expiry Report (${range.label})`,
      icon: KeyRound,
    },
  ];

  const emptyBlock = (icon?: React.ReactNode, message = "No data available for this period.") => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      {icon && <div className="mx-auto mb-2 flex justify-center text-gray-300">{icon}</div>}
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );

  const clientWorkStatusRows = (clientWork?.statusDistribution || []).map((s: any) => ({ status: s.status, count: s.count }));
  const clientWorkPlatformRows = (clientWork?.platformBreakdown || []).map((p: any) => ({ platform: p.platform, count: p.count }));
  const clientWorkCategoryRows = (clientWork?.categoryPerformance || []).map((c: any) => ({ category: c.categoryName, count: c.count }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || "Admin"}
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your projects.</p>
        </div>
        <div className="w-48">
          <Select
            label="Report Period"
            options={[
              { value: "this", label: "This Month" },
              { value: "last", label: "Last Month" },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: stats.totalClients, icon: Users, color: "bg-blue-500" },
          { label: `Calendar Entries (${range.label})`, value: stats.totalCalendarEntries, icon: Calendar, color: "bg-indigo-500" },
          { label: "Active Resources", value: stats.activeResources, icon: UserCheck, color: "bg-green-500" },
          { label: "Overdue Tasks", value: stats.overdueTasks, icon: AlertTriangle, color: "bg-red-500" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {reportCards.map((card) => {
          if (card.id === "credentials") {
            if (!isSuperAdmin) return null;
            return (
              <div key={card.id}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{card.title}</h2>
                {expiringCredentials.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-amber-100/50 text-left text-amber-800">
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Username</th>
                            <th className="px-4 py-3 font-medium">Expiry Date</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {expiringCredentials.map((c: any) => {
                            const days = Math.round((new Date(c.expiryDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                            return (
                              <tr key={c.id} className="hover:bg-amber-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.client?.name || "-"}</td>
                                <td className="px-4 py-3 text-gray-600">{c.customType || c.credentialType}</td>
                                <td className="px-4 py-3 text-gray-600">{c.username}</td>
                                <td className="px-4 py-3 text-gray-600">{formatDate(c.expiryDate)}</td>
                                <td className="px-4 py-3">
                                  <Badge variant={days < 0 ? "danger" : "warning"}>
                                    {days < 0 ? `Expired ${Math.abs(days)} days ago` : days === 0 ? "Expires today" : `In ${days} days`}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<KeyRound className="h-6 w-6" />)
                )}
              </div>
            );
          }

          return (
            <div key={card.id}>
              <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
                {card.id === "clientWork" && (
                  <div className="w-64">
                    <Select
                      label="Client"
                      options={[{ value: "", label: "Select a client" }, ...reportClients]}
                      value={clientWorkClientId}
                      onChange={handleClientWorkChange}
                    />
                  </div>
                )}
                {card.id === "postStatus" && (
                  <div className="w-64">
                    <Select
                      label="Client"
                      options={[{ value: "", label: "All clients" }, ...reportClients]}
                      value={postClientId}
                      onChange={handlePostClientChange}
                    />
                  </div>
                )}
                {card.id === "clientSummary" && (
                  <div className="w-64">
                    <Select
                      label="Client"
                      options={[{ value: "", label: "All clients" }, ...reportClients]}
                      value={csClientId}
                      onChange={handleClientSummaryChange}
                    />
                  </div>
                )}
                {card.id === "resourceSummary" && (
                  <div className="w-64">
                    <Select
                      label="Resource"
                      options={[{ value: "", label: "All resources" }, ...reportResources]}
                      value={resourceUserId}
                      onChange={handleResourceChange}
                    />
                  </div>
                )}
              </div>

              {card.id === "postsByStatus" &&
                (postsByStatus.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {postsByStatus.map((s) => (
                            <tr key={s.status} className="hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                                  {getStatusLabel(s.status)}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-900 font-medium">{s.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<BarChart3 className="h-6 w-6" />)
                ))}

              {card.id === "sla" &&
                (slaDistribution.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-5 py-3 font-medium">SLA Status</th>
                            <th className="px-5 py-3 font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {slaDistribution.map((s) => (
                            <tr key={s.name} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                              <td className="px-5 py-3 font-medium text-gray-900">{s.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<Layers className="h-6 w-6" />)
                ))}

              {card.id === "clientWork" &&
                (clientWorkClientId ? (
                  clientWork && (clientWork.totalPosts || 0) > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: "Total Posts", value: clientWork.totalPosts || 0 },
                          { label: "Posted", value: (clientWork.statusDistribution || []).find((s: any) => s.status === "POSTED")?.count || 0 },
                          { label: "Pending", value: (clientWork.totalPosts || 0) - ((clientWork.statusDistribution || []).find((s: any) => s.status === "POSTED")?.count || 0) },
                          { label: "Total Reach", value: clientWork.engagement?.reach || 0 },
                          { label: "Total Engagement", value: clientWork.engagement?.engagement || 0 },
                        ].map((kpi) => (
                          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                            <p className="text-xs text-gray-500">{kpi.label}</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-900">Status Breakdown</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500">
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 font-medium">Count</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {(clientWorkStatusRows.length > 0 ? clientWorkStatusRows : []).map((s: any) => (
                                <tr key={s.status} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700">{getStatusLabel(s.status)}</td>
                                  <td className="px-4 py-2 text-gray-900 font-medium">{s.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-900">Platform Breakdown</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500">
                                <th className="px-4 py-2 font-medium">Platform</th>
                                <th className="px-4 py-2 font-medium">Count</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {clientWorkPlatformRows.map((p: any) => (
                                <tr key={p.platform} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700">{p.platform}</td>
                                  <td className="px-4 py-2 text-gray-900 font-medium">{p.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-900">Category Performance</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500">
                                <th className="px-4 py-2 font-medium">Category</th>
                                <th className="px-4 py-2 font-medium">Posts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {clientWorkCategoryRows.map((c: any) => (
                                <tr key={c.category} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700">{c.category}</td>
                                  <td className="px-4 py-2 text-gray-900 font-medium">{c.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    emptyBlock(<FileText className="h-6 w-6" />, "No data available for this client in the selected period.")
                  )
                ) : (
                  emptyBlock(<FileText className="h-6 w-6" />, "Select a client to view their work report.")
                ))}

              {card.id === "postStatus" &&
                (postReport && (postReport.posts || []).length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-sm text-gray-500">{postReport.totalPosts || 0} posts in period</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-5 py-3 font-medium">Title</th>
                            <th className="px-5 py-3 font-medium">Client</th>
                            <th className="px-5 py-3 font-medium">Category</th>
                            <th className="px-5 py-3 font-medium">Platform</th>
                            <th className="px-5 py-3 font-medium">Posting Date</th>
                            <th className="px-5 py-3 font-medium">Completion Date</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(postReport.posts || []).map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{p.title}</td>
                              <td className="px-5 py-3 text-gray-600">{p.client}</td>
                              <td className="px-5 py-3 text-gray-600">{p.category}</td>
                              <td className="px-5 py-3 text-gray-600">{Array.isArray(p.platform) ? p.platform.join(", ") : (p.platform || "-")}</td>
                              <td className="px-5 py-3 text-gray-600">{formatDate(p.postingDate)}</td>
                              <td className="px-5 py-3 text-gray-600">{p.completionDate ? formatDate(p.completionDate) : "-"}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                                  {getStatusLabel(p.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<ClipboardList className="h-6 w-6" />)
                ))}

              {card.id === "clientSummary" &&
                (clientSummary && (clientSummary.clients || []).length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-5 py-3 font-medium">Client</th>
                            <th className="px-5 py-3 font-medium">Total Posts</th>
                            <th className="px-5 py-3 font-medium">Posted</th>
                            <th className="px-5 py-3 font-medium">Pending</th>
                            <th className="px-5 py-3 font-medium">Total Reach</th>
                            <th className="px-5 py-3 font-medium">Total Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(clientSummary.clients || []).map((c: any) => (
                            <tr key={c.clientId} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{c.clientName}</td>
                              <td className="px-5 py-3 text-gray-600">{c.totalPosts}</td>
                              <td className="px-5 py-3"><Badge variant="success">{c.posted}</Badge></td>
                              <td className="px-5 py-3 text-gray-600">{c.pending}</td>
                              <td className="px-5 py-3 text-gray-600">{c.totalReach || 0}</td>
                              <td className="px-5 py-3 text-gray-600">{c.totalEngagement || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<Users className="h-6 w-6" />)
                ))}

              {card.id === "resourceSummary" &&
                (resourceSummary && (resourceSummary.report || []).length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-5 py-3 font-medium">Resource</th>
                            <th className="px-5 py-3 font-medium">Calendar Assigned</th>
                            <th className="px-5 py-3 font-medium">Calendar Posted</th>
                            <th className="px-5 py-3 font-medium">Calendar Pending</th>
                            <th className="px-5 py-3 font-medium">Adhoc Assigned</th>
                            <th className="px-5 py-3 font-medium">Adhoc Completed</th>
                            <th className="px-5 py-3 font-medium">Adhoc Pending</th>
                            <th className="px-5 py-3 font-medium">Total Tasks</th>
                            <th className="px-5 py-3 font-medium">Total Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(resourceSummary.report || []).map((r: any) => (
                            <tr key={r.userId} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                              <td className="px-5 py-3 text-gray-600">{r.calendarAssigned}</td>
                              <td className="px-5 py-3"><Badge variant="success">{r.calendarPosted}</Badge></td>
                              <td className="px-5 py-3 text-gray-600">{r.calendarPending}</td>
                              <td className="px-5 py-3 text-gray-600">{r.adhocAssigned}</td>
                              <td className="px-5 py-3 text-gray-600">{r.adhocCompleted}</td>
                              <td className="px-5 py-3 text-gray-600">{r.adhocPending}</td>
                              <td className="px-5 py-3 text-gray-900 font-medium">{r.totalTasks}</td>
                              <td className="px-5 py-3 text-gray-600 font-mono">{formatDuration(r.totalSeconds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  emptyBlock(<UserCheck className="h-6 w-6" />)
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}