import { NextResponse } from "next/server";
import { AdhocStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const CLOSED_STATUSES: AdhocStatus[] = [AdhocStatus.COMPLETED, AdhocStatus.NOT_APPLICABLE];

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
    const ids = searchParams.get("ids");
    const status = searchParams.get("status");

    const where: Prisma.AdhocTaskWhereInput = {};
    if (clientId) where.clientId = clientId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      where.id = { in: idList };
    }

    // Closed tasks stay in the database and remain available via the
    // Completed/Closed filter, but are hidden from the default listing.
    if (status === "ACTIVE" || !status) {
      where.status = { notIn: CLOSED_STATUSES };
    } else if (status === "CLOSED") {
      where.status = { in: CLOSED_STATUSES };
    } else if (status !== "ALL") {
      where.status = status as AdhocStatus;
    }

    if (startDate || endDate) {
      const deadlineFilter: Prisma.DateTimeNullableFilter = {};
      if (startDate) deadlineFilter.gte = new Date(startDate);
      if (endDate) deadlineFilter.lte = new Date(endDate + "T23:59:59.999Z");
      where.deadline = deadlineFilter;
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
