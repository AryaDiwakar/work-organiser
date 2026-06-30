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

    const {
      calendarEntryId,
      linkedinReach, facebookReach, instagramReach,
      youtubeReach, googleReach, twitterReach,
    } = await req.json();

    if (!calendarEntryId) {
      return NextResponse.json({ error: "calendarEntryId is required" }, { status: 400 });
    }

    const totalReach = (linkedinReach || 0) + (facebookReach || 0) + (instagramReach || 0) +
      (youtubeReach || 0) + (googleReach || 0) + (twitterReach || 0);

    const entry = await prisma.calendarEntry.findUnique({ where: { id: calendarEntryId } });
    if (!entry) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    if (entry.status !== "POSTED") {
      return NextResponse.json({ error: "Can only record performance for posted entries" }, { status: 400 });
    }

    const performance = await prisma.performanceEntry.upsert({
      where: { calendarEntryId },
      update: {
        linkedinReach, facebookReach, instagramReach,
        youtubeReach, googleReach, twitterReach,
        totalReach,
      },
      create: {
        calendarEntryId,
        linkedinReach, facebookReach, instagramReach,
        youtubeReach, googleReach, twitterReach,
        totalReach,
      },
    });

    return NextResponse.json(performance);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save performance" }, { status: 500 });
  }
}
