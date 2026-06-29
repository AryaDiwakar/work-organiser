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

    const where: Record<string, unknown> = { isActive: true };
    if (clientId) where.clientId = clientId;

    const categories = await prisma.category.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, clientId } = await req.json();

    if (!name || !clientId) {
      return NextResponse.json({ error: "Name and clientId are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const existing = await prisma.category.findUnique({
      where: { name_clientId: { name, clientId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Category already exists for this client" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, description, color, clientId },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
