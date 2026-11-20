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

export async function GET(_req: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billId } = await params;
    const bill = await prisma.financeBill.findUnique({ where: { id: billId }, include: billInclude });
    if (!bill) {
      return NextResponse.json({ error: "Finance entry not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Failed to fetch finance entry:", error);
    return NextResponse.json({ error: "Failed to fetch finance entry" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billId } = await params;
    const existing = await prisma.financeBill.findUnique({ where: { id: billId } });
    if (!existing) {
      return NextResponse.json({ error: "Finance entry not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { clientId?: string; dueDate?: Date; value?: number; paymentTowards?: string } = {};

    if (body.clientId !== undefined) {
      const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
      if (!clientId) {
        return NextResponse.json({ error: "Client is required" }, { status: 400 });
      }
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      data.clientId = clientId;
    }

    if (body.dueDate !== undefined) {
      const dueDate = parseDate(body.dueDate);
      if (!dueDate) {
        return NextResponse.json({ error: "A valid due date is required" }, { status: 400 });
      }
      data.dueDate = dueDate;
    }

    if (body.value !== undefined) {
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: "Value must be greater than zero" }, { status: 400 });
      }
      data.value = value;
    }

    if (body.paymentTowards !== undefined) {
      const paymentTowards = typeof body.paymentTowards === "string" ? body.paymentTowards.trim() : "";
      if (!paymentTowards) {
        return NextResponse.json({ error: "Payment towards is required" }, { status: 400 });
      }
      data.paymentTowards = paymentTowards;
    }

    const bill = await prisma.financeBill.update({
      where: { id: billId },
      data,
      include: billInclude,
    });

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Failed to update finance entry:", error);
    return NextResponse.json({ error: "Failed to update finance entry" }, { status: 500 });
  }
}
