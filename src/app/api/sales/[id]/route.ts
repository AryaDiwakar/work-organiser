import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const lead = await prisma.salesLead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.salesLead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const scopeStatusChanged = body.scopeStatus && body.scopeStatus !== existing.scopeStatus;

    const lead = await prisma.salesLead.update({
      where: { id },
      data: {
        companyName: body.companyName?.trim() || existing.companyName,
        referredBy: body.referredBy?.trim() ?? existing.referredBy,
        projectType: body.projectType?.trim() || existing.projectType,
        projectDetails: body.projectDetails?.trim() ?? existing.projectDetails,
        proposedQuote: body.proposedQuote !== undefined ? (body.proposedQuote ? parseFloat(body.proposedQuote) : null) : existing.proposedQuote,
        clientApprovedQuote: body.clientApprovedQuote !== undefined ? (body.clientApprovedQuote ? parseFloat(body.clientApprovedQuote) : null) : existing.clientApprovedQuote,
        scopeStatus: body.scopeStatus || existing.scopeStatus,
        statusUpdatedDate: scopeStatusChanged ? new Date() : existing.statusUpdatedDate,
        clientContactName: body.clientContactName?.trim() ?? existing.clientContactName,
        clientContactNumber: body.clientContactNumber?.trim() ?? existing.clientContactNumber,
        clientEmail: body.clientEmail?.trim() ?? existing.clientEmail,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.salesLead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
