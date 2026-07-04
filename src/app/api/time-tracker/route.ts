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
    const taskType = searchParams.get("taskType");
    const taskId = searchParams.get("taskId");
    const taskIds = searchParams.get("taskIds");

    if (taskType && taskIds) {
      const idList = taskIds.split(",").filter(Boolean);
      const timers = await prisma.taskTimer.findMany({
        where: { taskType, taskId: { in: idList } },
      });
      const totals: Record<string, number> = {};
      for (const t of timers) {
        if (t.endTime) {
          totals[t.taskId] = (totals[t.taskId] || 0) + Math.floor((t.endTime.getTime() - t.startTime.getTime()) / 1000);
        }
      }
      const activeTimers = timers.filter((t) => !t.endTime);
      for (const a of activeTimers) {
        totals[a.taskId] = (totals[a.taskId] || 0) + Math.floor((Date.now() - a.startTime.getTime()) / 1000);
      }
      return NextResponse.json(totals);
    }

    if (taskType && taskId) {
      const userId = searchParams.get("userId") || (session.user as { id: string }).id;
      const entries = await prisma.taskTimer.findMany({
        where: { userId, taskType, taskId },
        orderBy: { startTime: "asc" },
      });
      return NextResponse.json(entries);
    }

    const userId = (session.user as { id: string }).id;
    const active = await prisma.taskTimer.findFirst({
      where: { userId, endTime: null },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json({ active });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch timers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { action, taskType, taskId } = body;

    if (!action || !taskType || !taskId) {
      return NextResponse.json({ error: "action, taskType, and taskId are required" }, { status: 400 });
    }

    if (!["CALENDAR", "ADHOC"].includes(taskType)) {
      return NextResponse.json({ error: "taskType must be CALENDAR or ADHOC" }, { status: 400 });
    }

    switch (action) {
      case "start": {
        const existingRunning = await prisma.taskTimer.findFirst({
          where: { userId, endTime: null },
        });
        if (existingRunning) {
          await prisma.taskTimer.update({
            where: { id: existingRunning.id },
            data: { endTime: new Date() },
          });
        }
        const timer = await prisma.taskTimer.create({
          data: { userId, taskType, taskId, startTime: new Date() },
        });
        return NextResponse.json(timer);
      }

      case "pause": {
        const running = await prisma.taskTimer.findFirst({
          where: { userId, taskType, taskId, endTime: null },
        });
        if (!running) {
          return NextResponse.json({ error: "No running timer found" }, { status: 404 });
        }
        const updated = await prisma.taskTimer.update({
          where: { id: running.id },
          data: { endTime: new Date() },
        });
        return NextResponse.json(updated);
      }

      case "resume": {
        const existingRunning = await prisma.taskTimer.findFirst({
          where: { userId, endTime: null },
        });
        if (existingRunning) {
          await prisma.taskTimer.update({
            where: { id: existingRunning.id },
            data: { endTime: new Date() },
          });
        }
        const timer = await prisma.taskTimer.create({
          data: { userId, taskType, taskId, startTime: new Date() },
        });
        return NextResponse.json(timer);
      }

      case "stop": {
        const running = await prisma.taskTimer.findFirst({
          where: { userId, taskType, taskId, endTime: null },
        });
        if (running) {
          const updated = await prisma.taskTimer.update({
            where: { id: running.id },
            data: { endTime: new Date() },
          });
          return NextResponse.json(updated);
        }
        const entries = await prisma.taskTimer.findMany({
          where: { userId, taskType, taskId },
          orderBy: { startTime: "asc" },
        });
        return NextResponse.json(entries);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process timer action" }, { status: 500 });
  }
}
