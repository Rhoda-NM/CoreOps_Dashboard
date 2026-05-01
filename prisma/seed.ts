import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create user
  const user = await prisma.user.upsert({
    where: { email: "rhoda@coreops.dev" },
    update: {},
    create: {
      name: "Rhoda",
      email: "rhoda@coreops.dev",
    },
  });

  // 2. Create workspace (or reuse)
  const workspace = await prisma.workspace.upsert({
    where: { id: "coreops-studio" },
    update: {},
    create: {
      id: "coreops-studio",
      name: "CoreOps Studio",
      members: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
    },
  });

  // 3. Clear existing clients (for clean dev reset)
  await prisma.client.deleteMany({
    where: { workspaceId: workspace.id },
  });

  // =========================
  // CLIENT 1: Coastal Stays
  // =========================
  const coastalClient = await prisma.client.create({
    data: {
      name: "Coastal Stays",
      company: "Coastal Stays Ltd",
      email: "info@coastalstays.com",
      phone: "+254700000001",
      workspaceId: workspace.id,

      projects: {
        create: [
          {
            name: "Booking Website",
            description: "Direct booking platform for rentals",
            status: "ACTIVE",
          },
          {
            name: "Admin Dashboard",
            description: "Internal operations system",
            status: "ACTIVE",
          },
        ],
      },

      invoices: {
        create: [
          {
            invoiceNo: "INV-001",
            amount: 50000,
            status: "PAID",
          },
          {
            invoiceNo: "INV-002",
            amount: 75000,
            status: "SENT",
          },
        ],
      },
    },
  });

  // =========================
  // CLIENT 2: Pazuri Homes
  // =========================
  const pazuriClient = await prisma.client.create({
    data: {
      name: "Pazuri Homes",
      company: "Pazuri Living Ltd",
      email: "contact@pazuri.com",
      phone: "+254700000002",
      workspaceId: workspace.id,

      projects: {
        create: [
          {
            name: "Landing Page",
            description: "Marketing website",
            status: "COMPLETED",
          },
          {
            name: "Property Listings System",
            description: "Property management platform",
            status: "ACTIVE",
          },
        ],
      },

      invoices: {
        create: [
          {
            invoiceNo: "INV-003",
            amount: 30000,
            status: "PAID",
          },
          {
            invoiceNo: "INV-004",
            amount: 60000,
            status: "OVERDUE",
          },
        ],
      },
    },
  });

  console.log("Seeded successfully:");
  console.log({
    user,
    workspace,
    clients: [coastalClient.name, pazuriClient.name],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });