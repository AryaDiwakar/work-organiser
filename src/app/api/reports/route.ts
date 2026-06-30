import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!clientId || !month || !year) {
      return NextResponse.json({ error: "clientId, month, and year are required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    const dateGte = new Date(y, m - 1, 1);
    const dateLt = new Date(y, m, 1);

    const posts = await prisma.calendarEntry.findMany({
      where: {
        clientId,
        postingDate: { gte: dateGte, lt: dateLt },
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignedUser: { select: { id: true, name: true } },
        performance: true,
      },
    });

    const totalPosts = posts.length;

    const statusDistribution = posts.reduce<Record<string, number>>((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {});

    const platformBreakdown = posts.reduce<Record<string, number>>((acc, post) => {
      post.platform.forEach((p) => {
        acc[p] = (acc[p] || 0) + 1;
      });
      return acc;
    }, {});

    const categoryPerformance = posts.reduce<Record<string, { count: number; name: string }>>((acc, post) => {
      const catId = post.categoryId;
      if (!acc[catId]) {
        acc[catId] = { count: 0, name: post.category.name };
      }
      acc[catId].count++;
      return acc;
    }, {});

    const totalEngagement = posts.reduce(
      (acc, post) => {
        if (post.performance) {
          acc.totalReach += post.performance.totalReach || 0;
          acc.engagement += post.performance.engagement || 0;
        }
        return acc;
      },
      { totalReach: 0, engagement: 0 }
    );

    return NextResponse.json({
      clientId,
      month,
      year,
      totalPosts,
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({
        status,
        count,
      })),
      platformBreakdown: Object.entries(platformBreakdown).map(([platform, count]) => ({
        platform,
        count,
      })),
      categoryPerformance: Object.entries(categoryPerformance).map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        count: data.count,
      })),
      engagement: { reach: totalEngagement.totalReach, engagement: totalEngagement.engagement },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
