import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();

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
      data: { logoutTime: now, hoursWorked },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to record logout" }, { status: 500 });
  }
}
