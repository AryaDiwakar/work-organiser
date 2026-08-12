import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CAMPAIGN_TYPES, METRICS } from "@/lib/campaigns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json(campaigns);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
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

    const campaign = await prisma.campaign.create({
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
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
