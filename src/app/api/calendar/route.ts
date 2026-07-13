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
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};

    if (clientId) where.clientId = clientId;
    if (assignedTo) where.assignedTo = assignedTo;

    if (startDate || endDate) {
      where.postingDate = {};
      if (startDate) (where.postingDate as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.postingDate as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
    } else if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      where.postingDate = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    } else if (year) {
      const y = parseInt(year);
      where.postingDate = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }

    const entries = await prisma.calendarEntry.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        links: true,
      },
      orderBy: { postingDate: "asc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch calendar entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      categoryId,
      title,
      postType,
      platform,
      platforms: bodyPlatforms,
      postingDate,
      postingTime,
  assignedTo,
  assignedTo: bodyAssignedTo,
  assignedToMulti,
      caption,
      hashtags,
      designDirection,
      referenceLinks,
      creativeBrief,
    } = body;

    if (!clientId || !categoryId || !title || !postingDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const postingDateObj = new Date(postingDate);

    const approvalDeadline = new Date(postingDateObj);
    approvalDeadline.setDate(approvalDeadline.getDate() - 5);

    const schedulingDeadline = new Date(postingDateObj);
    schedulingDeadline.setDate(schedulingDeadline.getDate() - 3);

    const finalPlatforms = bodyPlatforms || platform || [];

    const entry = await prisma.calendarEntry.create({
      data: {
        clientId,
        categoryId,
        title,
        postType: postType || "POSTER",
        platform: finalPlatforms,
        postingDate: postingDateObj,
        postingTime: postingTime || null,
        assignedTo,
        creativeBrief,
        caption,
        hashtags: hashtags || [],
        designDirection,
        referenceLinks: referenceLinks || [],
        approvalDeadline,
        schedulingDeadline,
      },
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create calendar entry" }, { status: 500 });
  }
}
