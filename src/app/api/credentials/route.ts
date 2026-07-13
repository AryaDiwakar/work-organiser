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

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = { isActive: true };
    if (clientId) where.clientId = clientId;

    const credentials = await prisma.credential.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(credentials);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, credentials } = body;

    if (!clientId || !credentials || !Array.isArray(credentials) || credentials.length === 0) {
      return NextResponse.json({ error: "clientId and credentials array are required" }, { status: 400 });
    }

    const created = await prisma.credential.createMany({
      data: credentials.map((c: any) => ({
        clientId,
        credentialType: c.credentialType,
        customType: c.customType || null,
        username: c.username,
        password: c.password,
        expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
        contactPerson: c.contactPerson || null,
      })),
    });

    const allCreated = await prisma.credential.findMany({
      where: { clientId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(allCreated, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create credentials" }, { status: 500 });
  }
}
