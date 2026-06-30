import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const dateGte = new Date(year, month - 1, 1);
    const dateLt = new Date(year, month, 1);

    const users = await prisma.user.findMany({
      where: { role: "RESOURCE" },
      select: { id: true, name: true, email: true },
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: dateGte, lt: dateLt },
        user: { role: "RESOURCE" },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    const leaves = await prisma.leave.findMany({
      where: {
        status: "approved",
        OR: [
          { startDate: { gte: dateGte, lt: dateLt } },
          { endDate: { gte: dateGte, lt: dateLt } },
        ],
      },
      include: { user: { select: { id: true, name: true } } },
    });

    const totalDays = new Date(year, month, 0).getDate();

    const summary = users.map((user) => {
      const userAttendance = attendanceRecords.filter((r) => r.userId === user.id);
      const presentDays = userAttendance.filter((r) => r.status === "present").length;
      const totalHours = userAttendance.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
      const userLeaves = leaves.filter((l) => l.userId === user.id);
      const leaveDays = userLeaves.reduce((sum, l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      const permissionHours = userLeaves
        .filter((l) => l.type === "permission")
        .reduce((sum, l) => sum + (l.permissionHours || 0), 0);

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        presentDays,
        absentDays: totalDays - presentDays - leaveDays,
        leaveDays,
        totalHours: Math.round(totalHours * 100) / 100,
        permissionHours,
        attendance: userAttendance.map((r) => ({
          date: r.date,
          loginTime: r.loginTime,
          logoutTime: r.logoutTime,
          hoursWorked: r.hoursWorked,
          status: r.status,
        })),
      };
    });

    return NextResponse.json({ month, year, totalDays, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch attendance summary" }, { status: 500 });
  }
}
