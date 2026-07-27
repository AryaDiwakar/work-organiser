import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.salesLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
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
      companyName,
      referredBy,
      projectType,
      projectDetails,
      proposedQuote,
      clientApprovedQuote,
      scopeStatus,
      clientContactName,
      clientContactNumber,
      clientEmail,
    } = body;

    if (!companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    if (!projectType?.trim()) {
      return NextResponse.json({ error: "Project type is required" }, { status: 400 });
    }

    const lead = await prisma.salesLead.create({
      data: {
        companyName: companyName.trim(),
        referredBy: referredBy?.trim() || null,
        projectType: projectType.trim(),
        projectDetails: projectDetails?.trim() || null,
        proposedQuote: proposedQuote ? parseFloat(proposedQuote) : null,
        clientApprovedQuote: clientApprovedQuote ? parseFloat(clientApprovedQuote) : null,
        scopeStatus: scopeStatus || "SHARED_TO_CLIENT",
        statusUpdatedDate: new Date(),
        clientContactName: clientContactName?.trim() || null,
        clientContactNumber: clientContactNumber?.trim() || null,
        clientEmail: clientEmail?.trim() || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
