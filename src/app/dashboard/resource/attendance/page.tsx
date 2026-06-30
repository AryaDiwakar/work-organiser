"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LogIn, LogOut, Clock, Calendar, UserCheck, UserX } from "lucide-react";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number | null;
  status: string;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  status: string;
  appliedAt: string;
}

export default function ResourceAttendancePage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate] = useState(firstDay.toISOString().split("T")[0]);
  const [endDate] = useState(now.toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", type: "leave", reason: "", permissionHours: "" });
  const [applyingLeave, setApplyingLeave] = useState(false);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, userId });
      const [attRes, leaveRes] = await Promise.all([
        fetch(`/api/attendance?${params}`),
        fetch(`/api/leave?userId=${userId}`),
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      const allRecords: AttendanceRecord[] = Array.isArray(attData) ? attData : attData.data || [];
      setRecords(allRecords);
      setLeaves(Array.isArray(leaveData) ? leaveData : leaveData.data || []);

      const todayStr = now.toISOString().split("T")[0];
      const today = allRecords.find((r) => r.date?.startsWith(todayStr)) || null;
      setTodayRecord(today);
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setLoggingIn(true);
    try {
      const res = await fetch("/api/attendance/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to login:", error);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/attendance/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleApplyLeave() {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    setApplyingLeave(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveForm, userId }),
      });
      if (res.ok) {
        setLeaveModalOpen(false);
        setLeaveForm({ startDate: "", endDate: "", type: "leave", reason: "", permissionHours: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to apply leave:", error);
    } finally {
      setApplyingLeave(false);
    }
  }

  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent" || r.status === "leave").length;
  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
  const isLoggedIn = !!todayRecord?.loginTime && !todayRecord?.logoutTime;

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
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Track your attendance and leaves.</p>
        </div>
        <div className="flex items-center gap-3">
          {todayRecord?.loginTime && todayRecord?.logoutTime ? (
            <Badge variant="success">Logged out today</Badge>
          ) : isLoggedIn ? (
            <Button onClick={handleLogout} isLoading={loggingOut} variant="danger">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Button onClick={handleLogin} isLoading={loggingIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}
          <Button variant="outline" onClick={() => setLeaveModalOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Apply Leave
          </Button>
        </div>
      </div>

      {todayRecord && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-800 mb-2">
            <Clock className="h-5 w-5" />
            <h2 className="font-semibold">Today&apos;s Attendance</h2>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-indigo-600">Login: </span>
              <span className="font-medium">{todayRecord.loginTime ? formatDateTime(new Date(todayRecord.loginTime)) : "-"}</span>
            </div>
            <div>
              <span className="text-indigo-600">Logout: </span>
              <span className="font-medium">{todayRecord.logoutTime ? formatDateTime(new Date(todayRecord.logoutTime)) : "Not yet"}</span>
            </div>
            {todayRecord.hoursWorked && (
              <div>
                <span className="text-indigo-600">Hours: </span>
                <span className="font-medium">{todayRecord.hoursWorked.toFixed(1)}h</span>
              </div>
            )}
            <Badge variant={todayRecord.status === "present" ? "success" : "default"}>
              {todayRecord.status}
            </Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-indigo-100">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Days</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present</p>
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
              <p className="text-sm text-gray-500">Absent</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">This Month&apos;s Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Login Time</th>
                <th className="px-5 py-3 font-medium">Logout Time</th>
                <th className="px-5 py-3 font-medium">Hours Worked</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{formatDate(new Date(record.date))}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {record.loginTime ? formatDateTime(new Date(record.loginTime)) : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {record.logoutTime ? formatDateTime(new Date(record.logoutTime)) : "-"}
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
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No attendance records for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Leave Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Start Date</th>
                <th className="px-5 py-3 font-medium">End Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaves.length > 0 ? (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900">{formatDate(new Date(leave.startDate))}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(new Date(leave.endDate))}</td>
                    <td className="px-5 py-3">
                      <Badge variant={leave.type === "leave" ? "warning" : "info"}>
                        {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">
                      {leave.reason || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={
                        leave.status === "approved" || leave.status === "APPROVED" ? "success" :
                        leave.status === "denied" || leave.status === "REJECTED" ? "danger" : "warning"
                      }>
                        {leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Apply Leave" size="md">
        <div className="space-y-4">
          <Input
            label="Start Date"
            id="leaveStart"
            type="date"
            value={leaveForm.startDate}
            onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
          />
          <Input
            label="End Date"
            id="leaveEnd"
            type="date"
            value={leaveForm.endDate}
            onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
          />
          <Select
            label="Type"
            options={[
              { value: "leave", label: "Leave" },
              { value: "permission", label: "Permission" },
            ]}
            value={leaveForm.type}
            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
          />
          {leaveForm.type === "permission" && (
            <Input label="Permission Hours" type="number" value={leaveForm.permissionHours} onChange={(e) => setLeaveForm({ ...leaveForm, permissionHours: e.target.value })} placeholder="e.g. 2" />
          )}
          <div className="w-full">
            <label htmlFor="leaveReason" className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              id="leaveReason"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setLeaveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyLeave} isLoading={applyingLeave}>Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
