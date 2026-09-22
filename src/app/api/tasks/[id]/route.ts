import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const RESOURCE_ALLOWED_STATUSES = ["STORYBOARD_COMPLETED", "DESIGN_COMPLETED", "DEVELOPMENT_COMPLETED"];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.adhocTask.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const userRole = (session.user as { role: string }).role;
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    if (body.status !== undefined) {
      if (!isAdmin && !RESOURCE_ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "Resources can only set Storyboard, Design, or Development Completed" },
          { status: 403 }
        );
      }
      if (!isAdmin && existing.status === "COMPLETED") {
        return NextResponse.json({ error: "Task is already completed" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline);
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;

    if (body.status !== undefined && body.status !== existing.status) {
      updateData.status = body.status;
      const history = Array.isArray(existing.statusHistory) ? (existing.statusHistory as unknown[]) : [];
      updateData.statusHistory = [
        ...history,
        {
          from: existing.status,
          to: body.status,
          changedAt: new Date().toISOString(),
          changedBy: (session.user as { name?: string }).name || "unknown",
        },
      ];
    }

    const task = await prisma.adhocTask.update({
      where: { id: id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.adhocTask.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.adhocTask.delete({ where: { id: id } });

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
