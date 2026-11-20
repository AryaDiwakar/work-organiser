import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const billInclude = {
  client: { select: { id: true, name: true } },
  payments: { orderBy: { receivedDate: "asc" as const } },
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bills = await prisma.financeBill.findMany({
      include: billInclude,
      orderBy: [{ client: { name: "asc" } }, { dueDate: "asc" }],
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("Failed to fetch finance entries:", error);
    return NextResponse.json({ error: "Failed to fetch finance entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const dueDate = parseDate(body.dueDate);
    const value = Number(body.value);
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const paymentTowards = typeof body.paymentTowards === "string" ? body.paymentTowards.trim() : "";

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ error: "A valid due date is required" }, { status: 400 });
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Value must be greater than zero" }, { status: 400 });
    }
    if (!paymentTowards) {
      return NextResponse.json({ error: "Payment towards is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const bill = await prisma.financeBill.create({
      data: { clientId, dueDate, value, paymentTowards },
      include: billInclude,
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("Failed to create finance entry:", error);
    return NextResponse.json({ error: "Failed to create finance entry" }, { status: 500 });
  }
}
