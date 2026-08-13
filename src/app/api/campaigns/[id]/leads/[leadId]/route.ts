import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; leadId: string }> }) {
  const { id, leadId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.campaignLead.findUnique({
      where: { id: leadId },
      include: { campaignDailyData: { select: { campaignId: true } } },
    });
    if (!existing || existing.campaignDailyData.campaignId !== id) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const lead = await prisma.campaignLead.update({
      where: { id: leadId },
      data: {
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        answers: body.answers && typeof body.answers === "object" ? body.answers : existing.answers,
      },
    });

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; leadId: string }> }) {
  const { id, leadId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.campaignLead.findUnique({
      where: { id: leadId },
      include: { campaignDailyData: { select: { campaignId: true } } },
    });
    if (!existing || existing.campaignDailyData.campaignId !== id) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.campaignLead.delete({ where: { id: leadId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
