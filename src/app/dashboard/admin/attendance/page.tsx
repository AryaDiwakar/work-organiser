"use client";
import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Search, Users, UserCheck, UserX, Clock } from "lucide-react";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number | null;
  status: string;
  user: { id: string; name: string; email: string };
}

export default function AttendancePage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [resourceFilter, setResourceFilter] = useState("");

  useEffect(() => {
    fetchAttendance();
    fetchUsers();
  }, [startDate, endDate, resourceFilter]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const usersData = Array.isArray(data) ? data : data.data || [];
      setUsers(usersData.filter((u: any) => u.isActive));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (resourceFilter) params.set("userId", resourceFilter);
      const res = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent" || r.status === "leave").length;
  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">Track resource attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Present</p>
              <p className="text-2xl font-bold text-gray-900">{totalPresent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-100">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Absent</p>
              <p className="text-2xl font-bold text-gray-900">{totalAbsent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          label="Start Date"
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="End Date"
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <div className="w-56">
          <Select
            label="Resource"
            options={[
              { value: "", label: "All Resources" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          />
        </div>
        <div className="pt-6">
          <Button onClick={fetchAttendance}>Refresh</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Resource Name</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Login Time</th>
                <th className="px-5 py-3 font-medium">Logout Time</th>
                <th className="px-5 py-3 font-medium">Hours Worked</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{record.user?.name || "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(record.date)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {record.loginTime ? formatDateTime(record.loginTime) : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {record.logoutTime ? formatDateTime(record.logoutTime) : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={
                        record.status === "present" ? "success" :
                        record.status === "absent" ? "danger" :
                        record.status === "leave" ? "warning" : "default"
                      }>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No attendance records found for the selected date range.
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
