import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getISTDateStart(date: Date): Date {
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
    if ((session.user as { role: string }).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const dateStart = getISTDateStart(date);
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });
    const resources = users.filter((u) => u.role === "RESOURCE");

    const [attendance, leaves, calendarEntries, adhocTasks] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: { gte: dateStart, lt: dateEnd } },
      }),
      prisma.leave.findMany({
        where: {
          status: "approved",
          startDate: { lte: dateEnd },
          endDate: { gte: dateStart },
        },
      }),
      prisma.calendarEntry.findMany({
        where: {
          OR: [
            { assignedToMulti: { hasSome: resources.map((r) => r.id) } },
            { assignedTo: { in: resources.map((r) => r.id) } },
          ],
        },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { postingDate: "asc" },
      }),
      prisma.adhocTask.findMany({
        where: { assignedTo: { in: resources.map((r) => r.id) } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const userHasWorkOnDay = new Map<string, boolean>();
    for (const e of calendarEntries) {
      const ids = [...(e.assignedToMulti || []), ...(e.assignedTo ? [e.assignedTo] : [])];
      for (const uid of ids) userHasWorkOnDay.set(uid, true);
    }
    for (const t of adhocTasks) {
      if (t.assignedTo) userHasWorkOnDay.set(t.assignedTo, true);
    }

    const report = resources.map((user) => {
      const att = attendance.find((a) => a.userId === user.id);
      const leave = leaves.find(
        (l) => l.userId === user.id
      );

      const calendarTasks = calendarEntries.filter((e) => {
        const ids = [...(e.assignedToMulti || []), ...(e.assignedTo ? [e.assignedTo] : [])];
        return ids.includes(user.id);
      }).map((e) => ({
        id: e.id,
        title: e.title,
        client: e.client?.name || "-",
        status: e.status,
        postingDate: e.postingDate,
      }));

      const adhoc = adhocTasks
        .filter((t) => t.assignedTo === user.id)
        .map((t) => ({
          id: t.id,
          title: t.title,
          client: t.client?.name || "-",
          status: t.status,
          deadline: t.deadline,
        }));

      const status: "present" | "leave" | "absent" =
        att?.status === "leave" || leave
          ? "leave"
          : att && att.loginTime
            ? "present"
            : userHasWorkOnDay.get(user.id)
              ? "present"
              : "absent";

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        status,
        loginTime: att?.loginTime ?? null,
        logoutTime: att?.logoutTime ?? null,
        hoursWorked: att?.hoursWorked ?? null,
        comments: att?.comments ?? null,
        calendarCount: calendarTasks.length,
        adhocCount: adhoc.length,
        totalTasks: calendarTasks.length + adhoc.length,
        calendarTasks,
        adhocTasks: adhoc,
      };
    });

    return NextResponse.json({
      date: dateParam || dateStart.toISOString().split("T")[0],
      totalWorkers: report.length,
      present: report.filter((r) => r.status === "present").length,
      leave: report.filter((r) => r.status === "leave").length,
      absent: report.filter((r) => r.status === "absent").length,
      report,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate daily employee report" }, { status: 500 });
  }
}