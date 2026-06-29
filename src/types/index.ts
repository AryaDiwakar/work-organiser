import { Role, CalendarStatus, PostType, AdhocStatus } from "@prisma/client";

export type { Role, CalendarStatus, PostType, AdhocStatus };

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

export interface DashboardStats {
  totalPosts: number;
  statusDistribution: { status: string; count: number }[];
  upcomingDeadlines: CalendarEntryWithRelations[];
  overdueTasks: number;
  resourceWorkload: { userId: string; name: string; count: number }[];
}

export interface CalendarEntryWithRelations {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  postType: PostType;
  platform: string[];
  creativeBrief?: string | null;
  caption?: string | null;
  hashtags: string[];
  designDirection?: string | null;
  referenceLinks: string[];
  postingDate: Date;
  postingTime?: string | null;
  status: CalendarStatus;
  slaStatus?: string | null;
  creationDate: Date;
  approvalDeadline?: Date | null;
  schedulingDeadline?: Date | null;
  approvalDate?: Date | null;
  schedulingDate?: Date | null;
  postedDate?: Date | null;
  assignedTo?: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  client?: { id: string; name: string };
  category?: { id: string; name: string; color: string };
  links?: PostLinkType[];
}

export interface PostLinkType {
  id: string;
  platform: string;
  url: string;
}

export interface LeaveWithUser {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: string;
  reason?: string | null;
  status: string;
  appliedAt: Date;
  isRed: boolean;
  user: { id: string; name: string; email: string };
}

export interface AttendanceWithUser {
  id: string;
  userId: string;
  date: Date;
  loginTime?: Date | null;
  logoutTime?: Date | null;
  hoursWorked?: number | null;
  status: string;
  user: { id: string; name: string; email: string };
}
