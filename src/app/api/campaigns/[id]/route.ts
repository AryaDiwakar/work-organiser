import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CAMPAIGN_TYPES, METRICS } from "@/lib/campaigns";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        dailyData: { orderBy: { date: "asc" } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      clientId,
      name,
      campaignType,
      customType,
      startDate,
      endDate,
      budgetType,
      dailyBudget,
      totalBudget,
      metrics,
      leadsFormQuestions,
    } = body;

    if (!clientId || !name?.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: "Client, name, start date, and end date are required" }, { status: 400 });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
    }
    if (budgetType !== "DAILY" && budgetType !== "TOTAL") {
      return NextResponse.json({ error: "Budget type is required" }, { status: 400 });
    }
    if (budgetType === "DAILY" && (dailyBudget === undefined || dailyBudget === null || dailyBudget === "")) {
      return NextResponse.json({ error: "Daily budget is required" }, { status: 400 });
    }
    if (budgetType === "TOTAL" && (totalBudget === undefined || totalBudget === null || totalBudget === "")) {
      return NextResponse.json({ error: "Total budget is required" }, { status: 400 });
    }
    if (!CAMPAIGN_TYPES.includes(campaignType)) {
      return NextResponse.json({ error: "Campaign type is required" }, { status: 400 });
    }

    const validMetricKeys: string[] = METRICS.map((m) => m.key);
    const cleanMetrics = Array.isArray(metrics)
      ? metrics.filter((m: string) => validMetricKeys.includes(m))
      : [];

    const cleanLeadsFormQuestions = Array.isArray(leadsFormQuestions)
      ? leadsFormQuestions.map((q: string) => String(q).trim()).filter(Boolean)
      : [];

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        clientId,
        name: name.trim(),
        campaignType,
        customType: campaignType === "OTHERS" ? customType?.trim() || null : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budgetType,
        dailyBudget: budgetType === "DAILY" ? parseFloat(dailyBudget) : null,
        totalBudget: budgetType === "TOTAL" ? parseFloat(totalBudget) : null,
        metrics: cleanMetrics,
        leadsForm: campaignType === "LEADS" ? { questions: cleanLeadsFormQuestions } : {},
      },
    });

    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
