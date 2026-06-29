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
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, startDate, endDate, type, reason } = await req.json();

    if (!userId || !startDate || !endDate) {
      return NextResponse.json({ error: "userId, startDate, and endDate are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const today = new Date();
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const dayOfWeek = start.getDay();
    const isRed = diffDays <= 15 && (dayOfWeek === 1 || dayOfWeek === 5);

    const leave = await prisma.leave.create({
      data: {
        userId,
        startDate: start,
        endDate: end,
        type: type || "leave",
        reason,
        isRed,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create leave" }, { status: 500 });
  }
}
