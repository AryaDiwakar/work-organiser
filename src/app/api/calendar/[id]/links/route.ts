import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.calendarEntry.findUnique({
      where: { id: id },
      include: { links: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    const { platform, url } = await req.json();

    if (!platform || !url) {
      return NextResponse.json({ error: "Platform and url are required" }, { status: 400 });
    }

    const link = await prisma.postLink.create({
      data: {
        calendarEntryId: id,
        platform,
        url,
      },
    });

    const updated = await prisma.calendarEntry.findUnique({
      where: { id: id },
      include: { links: true },
    });

    const allPlatformsCovered = existing.platform.every((p) =>
      updated?.links.some((l) => l.platform === p)
    );

    if (allPlatformsCovered && existing.status !== "POSTED") {
      await prisma.calendarEntry.update({
        where: { id: id },
        data: { status: "POSTED", postedDate: new Date() },
      });
    }

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add post link" }, { status: 500 });
  }
}
