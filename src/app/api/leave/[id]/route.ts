import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only ADMIN can update leave status" }, { status: 403 });
    }

    const existing = await prisma.leave.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const leave = await prisma.leave.update({
      where: { id: id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(leave);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update leave" }, { status: 500 });
  }
}
