import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendDailyReportEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, comments } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStart = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: dateStart, lt: dateEnd },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "No login record found for today" }, { status: 404 });
    }

    if (attendance.logoutTime) {
      return NextResponse.json({ error: "Already logged out today" }, { status: 400 });
    }

    const loginTime = attendance.loginTime!;
    const diffMs = now.getTime() - loginTime.getTime();
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { logoutTime: now, hoursWorked, comments: typeof comments === "string" && comments.trim() ? comments.trim() : null },
    });

    sendDailyReportForLogout(updated.userId).catch(() => {
      // Email is best-effort; never fail the check-out because of it.
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to record logout" }, { status: 500 });
  }
}

async function sendDailyReportForLogout(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateStart = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
  const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: dateStart } },
  });

  const calendarEntries = await prisma.calendarEntry.findMany({
    where: { assignedToMulti: { has: userId } },
    include: { client: { select: { name: true } } },
  });
  const adhocTasks = await prisma.adhocTask.findMany({
    where: { assignedTo: userId },
    include: { client: { select: { name: true } } },
  });

  const tasks = [
    ...calendarEntries.map((e) => ({
      title: e.title,
      client: e.client?.name || "-",
      status: e.status,
      type: "CALENDAR" as const,
    })),
    ...adhocTasks.map((t) => ({
      title: t.title,
      client: t.client?.name || "-",
      status: t.status,
      type: "ADHOC" as const,
    })),
  ];

  const dateLabel = istDate.toISOString().split("T")[0];

  await sendDailyReportEmail({
    date: dateLabel,
    employeeName: user.name,
    employeeEmail: user.email,
    loginTime: attendance?.loginTime ? attendance.loginTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
    logoutTime: attendance?.logoutTime ? attendance.logoutTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
    hoursWorked: attendance?.hoursWorked ?? null,
    comments: attendance?.comments ?? null,
    tasks,
  });
}
