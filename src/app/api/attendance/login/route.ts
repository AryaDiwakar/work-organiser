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

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStart = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: dateStart, lt: dateEnd },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already logged in today" }, { status: 400 });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: dateStart,
        loginTime: now,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record login" }, { status: 500 });
  }
}
