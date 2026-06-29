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
    });

    if (!existing) {
      return NextResponse.json({ error: "Calendar entry not found" }, { status: 404 });
    }

    const { notes } = await req.json();
    const userId = (session.user as { id: string }).id;

    const completion = await prisma.taskCompletion.create({
      data: {
        calendarEntryId: id,
        userId,
        notes,
      },
    });

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark task as complete" }, { status: 500 });
  }
}
