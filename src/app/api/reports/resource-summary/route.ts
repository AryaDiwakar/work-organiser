import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminRole((session.user as { role: string }).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const userId = searchParams.get("userId");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const dateGte = new Date(y, m - 1, 1);
    const dateLt = new Date(y, m, 1);

    const resources = userId
      ? await prisma.user.findMany({ where: { id: userId, role: "RESOURCE", isActive: true }, select: { id: true, name: true, email: true } })
      : await prisma.user.findMany({ where: { role: "RESOURCE", isActive: true }, select: { id: true, name: true, email: true } });

    const resourceIds = resources.map((r) => r.id);

    const [calendarEntries, adhocTasks, timers] = await Promise.all([
      prisma.calendarEntry.findMany({
        where: {
          OR: [{ assignedToMulti: { hasSome: resourceIds } }, { assignedTo: { in: resourceIds } }],
          postingDate: { gte: dateGte, lt: dateLt },
        },
        include: { client: { select: { id: true, name: true } } },
      }),
      prisma.adhocTask.findMany({
        where: {
          assignedTo: { in: resourceIds },
          createdAt: { gte: dateGte, lt: dateLt },
        },
        include: { client: { select: { id: true, name: true } } },
      }),
      prisma.taskTimer.findMany({
        where: {
          userId: { in: resourceIds },
          date: { gte: dateGte, lt: dateLt },
        },
      }),
    ]);

    const report = resources
      .map((r) => {
      const calendar = calendarEntries.filter((e) => {
        const ids = [...(e.assignedToMulti || []), ...(e.assignedTo ? [e.assignedTo] : [])];
        return ids.includes(r.id);
      });
      const calendarPosted = calendar.filter((e) => e.status === "POSTED").length;
      const calendarPending = calendar.filter((e) => e.status !== "POSTED").length;

      const adhoc = adhocTasks.filter((t) => t.assignedTo === r.id);
      const adhocCompleted = adhoc.filter((t) => t.status === "COMPLETED").length;

      const userTimers = timers.filter((t) => t.userId === r.id);
      const seconds = userTimers.reduce(
        (sum, t) =>
          sum +
          (t.endTime
            ? Math.floor((t.endTime.getTime() - t.startTime.getTime()) / 1000)
            : Math.floor((Date.now() - t.startTime.getTime()) / 1000)),
        0
      );

      const byClientMap = new Map<string, {
        clientId: string;
        clientName: string;
        calendarAssigned: number;
        calendarPosted: number;
        calendarPending: number;
        adhocAssigned: number;
        adhocCompleted: number;
        adhocPending: number;
        totalTasks: number;
      }>();
      const ensureClient = (clientId: string | null, clientName: string) => {
        const key = clientId || "__unassigned__";
        if (!byClientMap.has(key)) {
          byClientMap.set(key, {
            clientId: clientId || "",
            clientName,
            calendarAssigned: 0,
            calendarPosted: 0,
            calendarPending: 0,
            adhocAssigned: 0,
            adhocCompleted: 0,
            adhocPending: 0,
            totalTasks: 0,
          });
        }
        return byClientMap.get(key)!;
      };

      for (const e of calendar) {
        const bucket = ensureClient(e.clientId, e.client?.name || "-");
        bucket.calendarAssigned += 1;
        if (e.status === "POSTED") bucket.calendarPosted += 1;
        else bucket.calendarPending += 1;
        bucket.totalTasks += 1;
      }
      for (const t of adhoc) {
        const bucket = ensureClient(t.clientId, t.client?.name || "-");
        bucket.adhocAssigned += 1;
        if (t.status === "COMPLETED") bucket.adhocCompleted += 1;
        else bucket.adhocPending += 1;
        bucket.totalTasks += 1;
      }

      return {
        userId: r.id,
        name: r.name,
        email: r.email,
        calendarAssigned: calendar.length,
        calendarPosted,
        calendarPending,
        adhocAssigned: adhoc.length,
        adhocCompleted,
        adhocPending: adhoc.length - adhocCompleted,
        totalTasks: calendar.length + adhoc.length,
        totalSeconds: seconds,
        sessions: userTimers.length,
        byClient: Array.from(byClientMap.values()).sort((a, b) => b.totalTasks - a.totalTasks),
      };
      })
      .filter((r) => r.totalTasks > 0 || r.totalSeconds > 0);

    return NextResponse.json({
      month,
      year,
      totalResources: report.length,
      report,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate resource summary" }, { status: 500 });
  }
}