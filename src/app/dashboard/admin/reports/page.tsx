"use client";
import { useState, useEffect } from "react";
import { getStatusLabel, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FileText, BarChart3, Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899"];

export default function ReportsPage() {
  const now = new Date();

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    }
  }

  async function generateClientReport() {
    if (!clientId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId, month, year });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  }

  function downloadExcel() {
    if (!report) return;
    const statusRows = (report.statusDistribution || []).map((s: any) => ({
      "Status": getStatusLabel(s.status),
      "Count": s.count,
    }));
    const platformRows = (report.platformBreakdown || []).map((p: any) => ({
      "Platform": p.platform,
      "Count": p.count,
    }));
    const categoryRows = (report.categoryPerformance || []).map((c: any) => ({
      "Category": c.categoryName,
      "Posts": c.count,
    }));
    const ws1 = XLSX.utils.json_to_sheet(statusRows);
    const ws2 = XLSX.utils.json_to_sheet(platformRows);
    const ws3 = XLSX.utils.json_to_sheet(categoryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Status");
    XLSX.utils.book_append_sheet(wb, ws2, "Platform");
    XLSX.utils.book_append_sheet(wb, ws3, "Category");
    XLSX.writeFile(wb, `client_report_${clientId}_${month}_${year}.xlsx`);
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1), label: new Date(2024, i).toLocaleString("default", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Work Report</h1>
        <p className="text-gray-500 mt-1">Generate client-wise performance report</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="space-y-6">
          <div className="flex items-end gap-4">
                <div className="w-64">
                  <Select label="Client" options={clients.map((c) => ({ value: c.id, label: c.name }))} value={clientId} onChange={(e) => setClientId(e.target.value)} />
                </div>
                <div className="w-40">
                  <Select label="Month" options={monthOptions} value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                <div className="w-32">
                  <Select label="Year" options={yearOptions} value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <Button onClick={generateClientReport} isLoading={loading}>Generate Report</Button>
                {report && (
                  <Button variant="outline" onClick={downloadExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>

              {report ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Posts</p>
                      <p className="text-2xl font-bold text-gray-900">{report.totalPosts || 0}</p>
                    </div>
                    {report.statusDistribution?.filter((s: any) => s.status === "POSTED").map((s: any) => (
                      <div key="posted" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                        <p className="text-sm text-gray-500">Posted</p>
                        <p className="text-2xl font-bold text-green-600">{s.count || 0}</p>
                      </div>
                    ))}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {(report.totalPosts || 0) - (report.statusDistribution?.find((s: any) => s.status === "POSTED")?.count || 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
                      <p className="text-sm text-gray-500">Total Engagement</p>
                      <p className="text-2xl font-bold text-indigo-600">{report.engagement?.reach || 0}</p>
                      <p className="text-xs text-gray-400">Total Reach</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
                      {report.statusDistribution?.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={report.statusDistribution}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="status" tickFormatter={(v) => getStatusLabel(v)} fontSize={11} />
                              <YAxis />
                              <Tooltip formatter={(value) => [value, "Count"]} labelFormatter={(v) => getStatusLabel(v)} />
                              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-gray-400 text-center py-12">No data available.</p>}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h2>
                      {report.platformBreakdown?.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={report.platformBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="platform" label>
                                {report.platformBreakdown.map((_: any, i: number) => (
                                  <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-gray-400 text-center py-12">No data available.</p>}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Category-wise Performance</h2>
                    {report.categoryPerformance?.length > 0 ? (
                      <div className="space-y-3">
                        {report.categoryPerformance.map((cat: any) => {
                          const maxCount = Math.max(...report.categoryPerformance.map((c: any) => c.count));
                          return (
                            <div key={cat.categoryId} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{cat.categoryName}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">{cat.count} posts</span>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, (cat.count / maxCount) * 100)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-gray-400 text-center py-8">No category data available.</p>}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Select a client and generate report to view data.</p>
                </div>
              )}
          </div>
        </div>
      </div>
  );
}
