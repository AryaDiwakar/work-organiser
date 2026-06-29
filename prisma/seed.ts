import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await hash("admin123", 12);
  const resourcePassword = await hash("resource123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@workorganiser.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@workorganiser.com",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Created super admin:", superAdmin.email);

  const admin = await prisma.user.upsert({
    where: { email: "admin@workorganiser.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@workorganiser.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin:", admin.email);

  const designer = await prisma.user.upsert({
    where: { email: "designer@workorganiser.com" },
    update: {},
    create: {
      name: "Designer Resource",
      email: "designer@workorganiser.com",
      password: resourcePassword,
      role: "RESOURCE",
    },
  });
  console.log("Created designer:", designer.email);

  const contentWriter = await prisma.user.upsert({
    where: { email: "content@workorganiser.com" },
    update: {},
    create: {
      name: "Content Writer",
      email: "content@workorganiser.com",
      password: resourcePassword,
      role: "RESOURCE",
    },
  });
  console.log("Created content writer:", contentWriter.email);

  const client = await prisma.client.upsert({
    where: { id: "demo-client-1" },
    update: {},
    create: {
      id: "demo-client-1",
      name: "Demo Client Inc.",
      email: "client@democlient.com",
      company: "Demo Client Inc.",
      phone: "+91-9876543210",
      website: "https://democlient.com",
      notes: "Demo client for testing",
    },
  });
  console.log("Created client:", client.name);

  const categories = [
    { name: "Brand Awareness", description: "Increase brand visibility", color: "#6366f1", clientId: client.id },
    { name: "Promotional", description: "Promote products/services", color: "#f59e0b", clientId: client.id },
    { name: "Educational", description: "Educate audience", color: "#10b981", clientId: client.id },
    { name: "Festive Campaigns", description: "Festival-related content", color: "#ef4444", clientId: client.id },
    { name: "Product Highlight", description: "Showcase products", color: "#8b5cf6", clientId: client.id },
    { name: "Engagement Posts", description: "Boost audience engagement", color: "#ec4899", clientId: client.id },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name_clientId: { name: cat.name, clientId: client.id } },
      update: {},
      create: cat,
    });
  }
  console.log("Created categories");

  console.log("\n✅ Seed completed successfully!");
  console.log("\nLogin Credentials:");
  console.log("  Super Admin: superadmin@workorganiser.com / admin123");
  console.log("  Admin:        admin@workorganiser.com / admin123");
  console.log("  Designer:     designer@workorganiser.com / resource123");
  console.log("  Content:      content@workorganiser.com / resource123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
