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

    const existing = await prisma.calendarEntry.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    const body = await req.json();
    const userRole = (session.user as { role: string }).role;

    if (body.status && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only ADMIN can change status" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.postType !== undefined) updateData.postType = body.postType;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.platforms !== undefined) updateData.platform = body.platforms;
    if (body.postingDate !== undefined) updateData.postingDate = new Date(body.postingDate);
    if (body.postingTime !== undefined) updateData.postingTime = body.postingTime;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.creativeBrief !== undefined) updateData.creativeBrief = body.creativeBrief;
    if (body.caption !== undefined) updateData.caption = body.caption;
    if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
    if (body.designDirection !== undefined) updateData.designDirection = body.designDirection;
    if (body.referenceLinks !== undefined) updateData.referenceLinks = body.referenceLinks;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.status !== undefined) updateData.status = body.status;

    if (body.status === "APPROVED") updateData.approvalDate = new Date();
    if (body.status === "SCHEDULED") updateData.schedulingDate = new Date();
    if (body.status === "POSTED") updateData.postedDate = new Date();

    const entry = await prisma.calendarEntry.update({
      where: { id: id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        links: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update calendar entry" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.calendarEntry.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    await prisma.calendarEntry.delete({ where: { id: id } });

    return NextResponse.json({ message: "Calendar entry deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete calendar entry" }, { status: 500 });
  }
}
