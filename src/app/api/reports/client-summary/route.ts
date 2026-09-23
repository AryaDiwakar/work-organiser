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
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const clientId = searchParams.get("clientId");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const dateGte = new Date(y, m - 1, 1);
    const dateLt = new Date(y, m, 1);

    const clients = (clientId
      ? await prisma.client.findMany({ where: { id: clientId, isActive: true }, select: { id: true, name: true } })
      : await prisma.client.findMany({ where: { isActive: true }, select: { id: true, name: true } }))
      .reduce<Record<string, string>>((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {});

    const posts = await prisma.calendarEntry.findMany({
      where: {
        clientId: clientId ? clientId : { in: Object.keys(clients) },
        postingDate: { gte: dateGte, lt: dateLt },
      },
      include: {
        performance: { select: { totalReach: true, engagement: true } },
      },
    });

    const byClient = new Map<string, { clientId: string; clientName: string; totalPosts: number; posted: number; pending: number; statusDistribution: Record<string, number>; totalReach: number; totalEngagement: number }>();

    for (const p of posts) {
      const clientName = clients[p.clientId];
      if (!clientName) continue;
      let row = byClient.get(p.clientId);
      if (!row) {
        row = {
          clientId: p.clientId,
          clientName,
          totalPosts: 0,
          posted: 0,
          pending: 0,
          statusDistribution: {},
          totalReach: 0,
          totalEngagement: 0,
        };
        byClient.set(p.clientId, row);
      }
      row.totalPosts += 1;
      if (p.status === "POSTED") row.posted += 1;
      else row.pending += 1;
      row.statusDistribution[p.status] = (row.statusDistribution[p.status] || 0) + 1;
      row.totalReach += p.performance?.totalReach || 0;
      row.totalEngagement += p.performance?.engagement || 0;
    }

    const rows = [...byClient.values()].sort((a, b) => b.totalPosts - a.totalPosts);

    return NextResponse.json({
      month,
      year,
      totalClients: rows.length,
      totalPosts: rows.reduce((s, r) => s + r.totalPosts, 0),
      clients: rows,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate client summary" }, { status: 500 });
  }
}