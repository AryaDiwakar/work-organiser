import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, month, year } = await req.json();

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
        assignedUser: { select: { id: true, name: true, email: true } },
        performance: true,
        links: true,
        taskCompletions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { postingDate: "asc" },
    });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, email: true, company: true },
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
          acc.linkedinReach += post.performance.linkedinReach || 0;
          acc.facebookReach += post.performance.facebookReach || 0;
          acc.instagramReach += post.performance.instagramReach || 0;
        }
        return acc;
      },
      { totalReach: 0, engagement: 0, linkedinReach: 0, facebookReach: 0, instagramReach: 0 }
    );

    const report = {
      exportDate: new Date().toISOString(),
      generatedBy: { id: (session.user as { id: string }).id },
      client,
      period: { month, year },
      summary: {
        totalPosts,
        statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ status, count })),
        platformBreakdown: Object.entries(platformBreakdown).map(([platform, count]) => ({ platform, count })),
        categoryPerformance: Object.entries(categoryPerformance).map(([id, data]) => ({
          categoryId: id,
          categoryName: data.name,
          count: data.count,
        })),
        engagement: totalEngagement,
      },
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        postType: post.postType,
        platform: post.platform,
        status: post.status,
        postingDate: post.postingDate,
        assignedTo: post.assignedUser,
        category: post.category,
        performance: post.performance,
        links: post.links,
        completions: post.taskCompletions,
      })),
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
