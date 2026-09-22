import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminRole((session.user as { role: string }).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const clientId = searchParams.get("clientId");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (startDate && endDate) {
      where.postingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const posts = await prisma.calendarEntry.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { postingDate: "asc" },
    });

    const statusDistribution = posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const posted = posts.filter((p) => p.status === "POSTED").length;
    const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;

    return NextResponse.json({
      startDate,
      endDate,
      clientId: clientId || null,
      totalPosts: posts.length,
      posted,
      scheduled,
      pending: posts.length - posted - scheduled,
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ status, count })),
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        client: p.client?.name || "-",
        category: p.category?.name || "-",
        platform: p.platform,
        postType: p.postType,
        postingDate: p.postingDate,
        completionDate: p.completionDate,
        status: p.status,
        slaStatus: p.slaStatus,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate post status report" }, { status: 500 });
  }
}