import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      const startTimeFilter: Record<string, Date> = {};
      if (startDate) startTimeFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        startTimeFilter.lte = end;
      }
      where.startTime = startTimeFilter;
    }

    const entries = await prisma.taskTimer.findMany({
      where,
      orderBy: { startTime: "desc" },
    });

    const taskIds = [...new Set(entries.map((e) => e.taskId))];
    const calendarIds = entries.filter((e) => e.taskType === "CALENDAR").map((e) => e.taskId);
    const adhocIds = entries.filter((e) => e.taskType === "ADHOC").map((e) => e.taskId);

    const [calEntries, adhocEntries] = await Promise.all([
      calendarIds.length
        ? prisma.calendarEntry.findMany({
            where: { id: { in: calendarIds } },
            select: { id: true, title: true, client: { select: { name: true } } },
          })
        : Promise.resolve([]),
      adhocIds.length
        ? prisma.adhocTask.findMany({
            where: { id: { in: adhocIds } },
            select: { id: true, title: true, client: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const taskMap: Record<string, { title: string; clientName: string }> = {};
    for (const c of calEntries) {
      taskMap[c.id] = { title: c.title, clientName: c.client?.name || "-" };
    }
    for (const a of adhocEntries) {
      taskMap[a.id] = { title: a.title, clientName: a.client?.name || "-" };
    }

    const entriesWithTask = entries.map((e) => ({
      id: e.id,
      taskType: e.taskType,
      taskId: e.taskId,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.endTime
        ? Math.floor((e.endTime.getTime() - e.startTime.getTime()) / 1000)
        : Math.floor((Date.now() - e.startTime.getTime()) / 1000),
      task: taskMap[e.taskId] || null,
    }));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user, entries: entriesWithTask });
  } catch (error) {
    console.error("Failed to fetch user timer data:", error);
    return NextResponse.json({ error: "Failed to fetch user timer data" }, { status: 500 });
  }
}
