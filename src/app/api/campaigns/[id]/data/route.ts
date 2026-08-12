import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function normalizeDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const { date } = body;
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const day = normalizeDate(date);
    if (day < campaign.startDate || day > campaign.endDate) {
      return NextResponse.json({ error: "Date must be within the campaign period" }, { status: 400 });
    }

    const data = {
      reach: toNumber(body.reach),
      impressions: toNumber(body.impressions),
      engagement: toNumber(body.engagement),
      sales: toNumber(body.sales),
      appInstalls: toNumber(body.appInstalls),
      inAppPurchases: toNumber(body.inAppPurchases),
      costPerResult: toNumber(body.costPerResult),
      amountSpent: toNumber(body.amountSpent),
    };

    const entry = await prisma.campaignDailyData.upsert({
      where: { campaignId_date: { campaignId: id, date: day } },
      update: data,
      create: { campaignId: id, date: day, ...data },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save daily data" }, { status: 500 });
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

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await prisma.campaignDailyData.deleteMany({
      where: { campaignId: id, date: normalizeDate(dateParam) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete daily data" }, { status: 500 });
  }
}
