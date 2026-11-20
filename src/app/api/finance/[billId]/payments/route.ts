import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billId } = await params;
    const bill = await prisma.financeBill.findUnique({ where: { id: billId }, select: { id: true } });
    if (!bill) {
      return NextResponse.json({ error: "Finance entry not found" }, { status: 404 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const receivedDate = typeof body.receivedDate === "string" ? new Date(body.receivedDate) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!receivedDate || Number.isNaN(receivedDate.getTime())) {
      return NextResponse.json({ error: "A valid received date is required" }, { status: 400 });
    }

    const payment = await prisma.financePayment.create({
      data: { billId, amount, receivedDate },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Failed to record payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
