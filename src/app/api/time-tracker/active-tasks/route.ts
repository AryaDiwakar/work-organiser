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
    const dateParam = searchParams.get("date");
    const userIdParam = searchParams.get("userId");

    if (!dateParam) {
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
    }

    const dateStart = getISTDate(new Date(dateParam));
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      date: { gte: dateStart, lt: dateEnd },
    };
    if (userIdParam) where.userId = userIdParam;

    const timers = await prisma.taskTimer.findMany({
      where,
      select: { taskType: true, taskId: true },
      distinct: ["taskType", "taskId"],
    });

    const calendarIds = timers.filter((t) => t.taskType === "CALENDAR").map((t) => t.taskId);
    const adhocIds = timers.filter((t) => t.taskType === "ADHOC").map((t) => t.taskId);

    return NextResponse.json({ calendarIds, adhocIds });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch active tasks" }, { status: 500 });
  }
}
