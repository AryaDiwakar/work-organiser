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
    const clientId = searchParams.get("clientId");
    const assignedTo = searchParams.get("assignedTo");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (assignedTo) where.assignedTo = assignedTo;

    if (startDate || endDate) {
      where.deadline = {};
      if (startDate) (where.deadline as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.deadline as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
    }

    const tasks = await prisma.adhocTask.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, title, description, deadline, assignedTo } = await req.json();

    if (!clientId || !title) {
      return NextResponse.json({ error: "ClientId and title are required" }, { status: 400 });
    }

    const task = await prisma.adhocTask.create({
      data: {
        clientId,
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        assignedTo,
      },
      include: {
        client: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
