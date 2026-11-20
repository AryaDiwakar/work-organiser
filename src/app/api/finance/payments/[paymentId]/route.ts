import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    const existing = await prisma.financePayment.findUnique({ where: { id: paymentId } });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { amount?: number; receivedDate?: Date } = {};

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
      }
      data.amount = amount;
    }

    if (body.receivedDate !== undefined) {
      const receivedDate = typeof body.receivedDate === "string" ? new Date(body.receivedDate) : null;
      if (!receivedDate || Number.isNaN(receivedDate.getTime())) {
        return NextResponse.json({ error: "A valid received date is required" }, { status: 400 });
      }
      data.receivedDate = receivedDate;
    }

    const payment = await prisma.financePayment.update({
      where: { id: paymentId },
      data,
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Failed to update payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
