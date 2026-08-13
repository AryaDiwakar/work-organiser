import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function normalizeDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const daily = await prisma.campaignDailyData.findUnique({
      where: { campaignId_date: { campaignId: id, date: normalizeDate(dateParam) } },
      include: { campaignLeads: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json(daily?.campaignLeads || []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
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
    if (campaign.campaignType !== "LEADS") {
      return NextResponse.json({ error: "Campaign is not a leads campaign" }, { status: 400 });
    }

    const body = await req.json();
    const { date, name, phone, answers } = body;
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const day = normalizeDate(date);
    if (day < campaign.startDate || day > campaign.endDate) {
      return NextResponse.json({ error: "Date must be within the campaign period" }, { status: 400 });
    }

    const daily = await prisma.campaignDailyData.upsert({
      where: { campaignId_date: { campaignId: id, date: day } },
      update: {},
      create: { campaignId: id, date: day },
    });

    const lead = await prisma.campaignLead.create({
      data: {
        campaignDailyDataId: daily.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        answers: answers && typeof answers === "object" ? answers : {},
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
