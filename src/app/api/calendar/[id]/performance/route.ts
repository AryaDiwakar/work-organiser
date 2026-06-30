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

    const existing = await prisma.calendarEntry.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    const { linkedinReach, facebookReach, instagramReach, youtubeReach, googleReach, twitterReach, engagement } = await req.json();

    const totalReach = (linkedinReach || 0) + (facebookReach || 0) + (instagramReach || 0) +
      (youtubeReach || 0) + (googleReach || 0) + (twitterReach || 0);

    const performance = await prisma.performanceEntry.upsert({
      where: { calendarEntryId: id },
      update: { linkedinReach, facebookReach, instagramReach, youtubeReach, googleReach, twitterReach, totalReach, engagement },
      create: { calendarEntryId: id, linkedinReach, facebookReach, instagramReach, youtubeReach, googleReach, twitterReach, totalReach, engagement },
    });

    return NextResponse.json(performance, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save performance data" }, { status: 500 });
  }
}
