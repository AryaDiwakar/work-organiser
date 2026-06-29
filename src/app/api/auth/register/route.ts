import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const userCount = await prisma.user.count();
    const userRole = userCount === 0 ? "SUPER_ADMIN" : role || "RESOURCE";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
      },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
