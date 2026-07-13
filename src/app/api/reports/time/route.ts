import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getISTDate(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const taskType = searchParams.get("taskType");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const dateStart = getISTDate(new Date(startDate));
    const dateEnd = new Date(getISTDate(new Date(endDate)).getTime() + 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      date: { gte: dateStart, lt: dateEnd },
    };
    if (userId) where.userId = userId;
    if (taskType && taskType !== "ALL") where.taskType = taskType;

    const timers = await prisma.taskTimer.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    });

    const completedTimers = timers.filter((t) => t.endTime);
    const activeTimers = timers.filter((t) => !t.endTime);

    const totalCompletedSeconds = completedTimers.reduce(
      (sum, t) => sum + Math.floor((t.endTime!.getTime() - t.startTime.getTime()) / 1000),
      0
    );
    const totalActiveSeconds = activeTimers.reduce(
      (sum, t) => sum + Math.floor((Date.now() - t.startTime.getTime()) / 1000),
      0
    );
    const totalSeconds = totalCompletedSeconds + totalActiveSeconds;

    const uniqueTaskIds = new Set(timers.map((t) => `${t.taskType}_${t.taskId}`));

    const byUser: Record<string, { name: string; seconds: number; sessions: number; taskTypes: Record<string, number> }> = {};
    for (const t of timers) {
      const uid = t.userId;
      if (!byUser[uid]) {
        byUser[uid] = { name: t.user.name, seconds: 0, sessions: 0, taskTypes: { CALENDAR: 0, ADHOC: 0 } };
      }
      const dur = t.endTime
        ? Math.floor((t.endTime.getTime() - t.startTime.getTime()) / 1000)
        : Math.floor((Date.now() - t.startTime.getTime()) / 1000);
      byUser[uid].seconds += dur;
      byUser[uid].sessions += 1;
      if (t.taskType === "CALENDAR" || t.taskType === "ADHOC") {
        byUser[uid].taskTypes[t.taskType] = (byUser[uid].taskTypes[t.taskType] || 0) + 1;
      }
    }

    const byDate: Record<string, { seconds: number; sessions: number; calendarCount: number; adhocCount: number }> = {};
    for (const t of timers) {
      const dateKey = t.date.toISOString().split("T")[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { seconds: 0, sessions: 0, calendarCount: 0, adhocCount: 0 };
      }
      const dur = t.endTime
        ? Math.floor((t.endTime.getTime() - t.startTime.getTime()) / 1000)
        : Math.floor((Date.now() - t.startTime.getTime()) / 1000);
      byDate[dateKey].seconds += dur;
      byDate[dateKey].sessions += 1;
      if (t.taskType === "CALENDAR") byDate[dateKey].calendarCount += 1;
      if (t.taskType === "ADHOC") byDate[dateKey].adhocCount += 1;
    }

    return NextResponse.json({
      summary: {
        totalSeconds,
        totalSessions: timers.length,
        uniqueTasks: uniqueTaskIds.size,
        avgSessionSeconds: timers.length > 0 ? Math.round(totalSeconds / timers.length) : 0,
      },
      byUser: Object.entries(byUser).map(([uid, data]) => ({
        userId: uid,
        ...data,
      })),
      byDate: Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          ...data,
        })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate time report" }, { status: 500 });
  }
}
