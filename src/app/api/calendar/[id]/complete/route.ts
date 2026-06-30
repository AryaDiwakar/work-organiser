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

    const entry = await prisma.calendarEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    await prisma.taskCompletion.create({
      data: {
        calendarEntryId: id,
        userId: (session.user as { id: string }).id,
        notes: "Marked complete by resource",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark complete" }, { status: 500 });
  }
}
