import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const superAdminPassword = await hash("G0d1g1t3ll#2024!SuP3r", 12);
    const adminPassword = await hash("G0d1g1t3ll#2024!Adm1n", 12);
    const resourcePassword = await hash("G0d1g1t3ll#2024!Res0urce", 12);

    await prisma.user.upsert({ where: { email: "superadmin@godigitell.com" }, update: { password: superAdminPassword, name: "Super Admin" }, create: { email: "superadmin@godigitell.com", name: "Super Admin", password: superAdminPassword, role: "SUPER_ADMIN" } });
    await prisma.user.upsert({ where: { email: "admin@godigitell.com" }, update: { password: adminPassword, name: "Admin User" }, create: { email: "admin@godigitell.com", name: "Admin User", password: adminPassword, role: "ADMIN" } });
    await prisma.user.upsert({ where: { email: "designer@godigitell.com" }, update: { password: resourcePassword, name: "Designer Resource" }, create: { email: "designer@godigitell.com", name: "Designer Resource", password: resourcePassword, role: "RESOURCE" } });
    await prisma.user.upsert({ where: { email: "content@godigitell.com" }, update: { password: resourcePassword, name: "Content Writer" }, create: { email: "content@godigitell.com", name: "Content Writer", password: resourcePassword, role: "RESOURCE" } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

