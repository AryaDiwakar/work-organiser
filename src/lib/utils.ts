import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function calculateSLADeadlines(postingDate: Date) {
  const postDate = new Date(postingDate);
  const approvalDeadline = new Date(postDate);
  approvalDeadline.setDate(approvalDeadline.getDate() - 5);

  const schedulingDeadline = new Date(postDate);
  schedulingDeadline.setDate(schedulingDeadline.getDate() - 3);

  const contentReadinessDeadline = new Date(postDate);
  contentReadinessDeadline.setDate(contentReadinessDeadline.getDate() - 7);

  return {
    approvalDeadline,
    schedulingDeadline,
    contentReadinessDeadline,
    postingDate: postDate,
  };
}

export function getSLAStatus(entry: {
  status: string;
  postingDate: Date;
  approvalDeadline?: Date | null;
  schedulingDeadline?: Date | null;
  approvalDate?: Date | null;
  schedulingDate?: Date | null;
}): { status: string; label: string; color: string } {
  const now = new Date();
  const postDate = new Date(entry.postingDate);

  const sla = calculateSLADeadlines(postDate);

  if (entry.status === "POSTED" || entry.status === "SCHEDULED") {
    return { status: "on_track", label: "On Track", color: "🟢" };
  }

  if (now > postDate) {
    return { status: "overdue", label: "Overdue", color: "🔴" };
  }

  if (entry.approvalDeadline && now > new Date(entry.approvalDeadline) && entry.status !== "APPROVED") {
    return { status: "overdue_approval", label: "Overdue Approval", color: "🔴" };
  }

  if (entry.schedulingDeadline && now > new Date(entry.schedulingDeadline) && entry.status !== "SCHEDULED") {
    return { status: "overdue_scheduling", label: "Overdue Scheduling", color: "🔴" };
  }

  const daysToPost = Math.ceil((postDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToPost <= 1) {
    return { status: "critical", label: "Critical", color: "🔴" };
  }
  if (daysToPost <= 3) {
    return { status: "overdue_scheduling", label: "Scheduling Due", color: "🟡" };
  }
  if (daysToPost <= 5) {
    return { status: "approval_pending", label: "Approval Pending", color: "🟡" };
  }
  if (daysToPost <= 7) {
    return { status: "content_delay_risk", label: "Content Delay Risk", color: "🟡" };
  }

  return { status: "on_track", label: "On Track", color: "🟢" };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    YET_TO_BE_DONE: "bg-gray-100 text-gray-800",
    DESIGNED: "bg-blue-100 text-blue-800",
    SHARED_TO_CLIENT: "bg-indigo-100 text-indigo-800",
    APPROVED: "bg-green-100 text-green-800",
    INTERNAL_FEEDBACK: "bg-yellow-100 text-yellow-800",
    CLIENT_FEEDBACK: "bg-orange-100 text-orange-800",
    SCHEDULED: "bg-purple-100 text-purple-800",
    POSTED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
    STORYBOARD_COMPLETED: "bg-cyan-100 text-cyan-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    YET_TO_BE_DONE: "Yet to be done",
    DESIGNED: "Designed",
    SHARED_TO_CLIENT: "Shared to client",
    APPROVED: "Approved",
    INTERNAL_FEEDBACK: "Internal Feedback",
    CLIENT_FEEDBACK: "Client Feedback",
    SCHEDULED: "Scheduled",
    POSTED: "Posted",
    REJECTED: "Rejected",
    STORYBOARD_COMPLETED: "Storyboard Completed",
  };
  return labels[status] || status;
}

export function isReworkStatus(status: string): boolean {
  return ["INTERNAL_FEEDBACK", "CLIENT_FEEDBACK", "REJECTED", "YET_TO_BE_DONE"].includes(status);
}

export function isAdminRole(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function getLeaveColor(appliedAt: Date, startDate: Date): string {
  const applied = new Date(appliedAt);
  const start = new Date(startDate);
  const diffDays = Math.ceil((start.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = start.getDay();
  const isFridayOrMonday = dayOfWeek === 1 || dayOfWeek === 5;

  if (diffDays <= 15 && isFridayOrMonday) {
    return "🔴";
  }
  return "🟡";
}
