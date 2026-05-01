import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const today = new Date();

function daysFromNow(days: number) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "rhoda@coreops.dev" },
    update: {},
    create: {
      name: "Rhoda",
      email: "rhoda@coreops.dev",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "coreops-studio" },
    update: {
      name: "CoreOps Studio",
    },
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

  // Clean existing demo data for this workspace
  const existingClients = await prisma.client.findMany({
  where: {
    workspaceId: workspace.id,
  },
  select: {
    id: true,
  },
});

const clientIds = existingClients.map((client) => client.id);

await prisma.task.deleteMany({
  where: {
    project: {
      clientId: {
        in: clientIds,
      },
    },
  },
});

await prisma.invoice.deleteMany({
  where: {
    clientId: {
      in: clientIds,
    },
  },
});

await prisma.project.deleteMany({
  where: {
    clientId: {
      in: clientIds,
    },
  },
});

await prisma.client.deleteMany({
  where: {
    id: {
      in: clientIds,
    },
  },
});

  await prisma.client.create({
    data: {
      name: "Coastal Stays",
      company: "Coastal Stays Ltd",
      email: "info@coastalstays.co.ke",
      phone: "+254700000001",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "Direct Booking Website",
            description:
              "A direct booking website for short-term rental guests.",
            status: "ACTIVE",
            budget: "120000",
            deadline: daysFromNow(18),
            tasks: {
              create: [
                {
                  title: "Design homepage and property listing layout",
                  description: "Create responsive UI for landing page and listings.",
                  priority: "HIGH",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(3),
                },
                {
                  title: "Build booking inquiry form",
                  description: "Capture guest dates, contact info, and property interest.",
                  priority: "MEDIUM",
                  status: "TODO",
                  dueDate: daysFromNow(7),
                },
                {
                  title: "Connect inquiry emails",
                  description: "Send booking requests to property manager inbox.",
                  priority: "MEDIUM",
                  status: "TODO",
                  dueDate: daysFromNow(10),
                },
              ],
            },
          },
          {
            name: "Guest Issue Tracker",
            description:
              "Internal issue logging for maintenance, cleaning, and guest concerns.",
            status: "COMPLETED",
            budget: "85000",
            deadline: daysFromNow(-20),
            tasks: {
              create: [
                {
                  title: "Create guest concern form",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-28),
                },
                {
                  title: "Build manager dashboard",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-24),
                },
                {
                  title: "Add status workflow",
                  priority: "MEDIUM",
                  status: "DONE",
                  dueDate: daysFromNow(-21),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-CS-001",
            amount: "50000",
            status: "PAID",
            dueDate: daysFromNow(-25),
          },
          {
            invoiceNo: "INV-CS-002",
            amount: "70000",
            status: "SENT",
            dueDate: daysFromNow(10),
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "Pazuri Homes",
      company: "Pazuri Living Ltd",
      email: "hello@pazurihomes.co.ke",
      phone: "+254700000002",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "Property Listings Platform",
            description:
              "A property listing system for showcasing available rentals and homes.",
            status: "ACTIVE",
            budget: "180000",
            deadline: daysFromNow(25),
            tasks: {
              create: [
                {
                  title: "Create property data model",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-4),
                },
                {
                  title: "Build property cards",
                  priority: "MEDIUM",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(5),
                },
                {
                  title: "Add search and filter",
                  priority: "HIGH",
                  status: "TODO",
                  dueDate: daysFromNow(12),
                },
                {
                  title: "Create admin property upload form",
                  priority: "URGENT",
                  status: "TODO",
                  dueDate: daysFromNow(-2),
                },
              ],
            },
          },
          {
            name: "Brand Landing Page",
            description: "Premium landing page for lead generation.",
            status: "COMPLETED",
            budget: "45000",
            deadline: daysFromNow(-35),
            tasks: {
              create: [
                {
                  title: "Write hero section copy",
                  priority: "MEDIUM",
                  status: "DONE",
                  dueDate: daysFromNow(-40),
                },
                {
                  title: "Design landing page",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-38),
                },
                {
                  title: "Deploy landing page",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-35),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-PH-001",
            amount: "30000",
            status: "PAID",
            dueDate: daysFromNow(-32),
          },
          {
            invoiceNo: "INV-PH-002",
            amount: "60000",
            status: "OVERDUE",
            dueDate: daysFromNow(-6),
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "Nairobi Creatives",
      company: "Nairobi Creatives Agency",
      email: "team@nairobicreatives.co.ke",
      phone: "+254700000003",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "Portfolio Website Revamp",
            description:
              "Modern portfolio website for agency credibility and lead capture.",
            status: "PAUSED",
            budget: "95000",
            deadline: daysFromNow(30),
            tasks: {
              create: [
                {
                  title: "Audit existing website",
                  priority: "MEDIUM",
                  status: "DONE",
                  dueDate: daysFromNow(-10),
                },
                {
                  title: "Create new sitemap",
                  priority: "MEDIUM",
                  status: "REVIEW",
                  dueDate: daysFromNow(-1),
                },
                {
                  title: "Design case study section",
                  priority: "HIGH",
                  status: "TODO",
                  dueDate: daysFromNow(9),
                },
              ],
            },
          },
          {
            name: "Campaign Analytics Dashboard",
            description:
              "Internal dashboard for monitoring campaign performance.",
            status: "ACTIVE",
            budget: "160000",
            deadline: daysFromNow(40),
            tasks: {
              create: [
                {
                  title: "Define KPI metrics",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-6),
                },
                {
                  title: "Build analytics cards",
                  priority: "HIGH",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(6),
                },
                {
                  title: "Add CSV export",
                  priority: "LOW",
                  status: "TODO",
                  dueDate: daysFromNow(21),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-NC-001",
            amount: "45000",
            status: "PAID",
            dueDate: daysFromNow(-12),
          },
          {
            invoiceNo: "INV-NC-002",
            amount: "50000",
            status: "DRAFT",
            dueDate: daysFromNow(14),
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "Savannah Legal",
      company: "Savannah Legal Consultants",
      email: "admin@savannahlegal.co.ke",
      phone: "+254700000004",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "Client Intake System",
            description:
              "A secure intake workflow for new legal consultation requests.",
            status: "ACTIVE",
            budget: "140000",
            deadline: daysFromNow(15),
            tasks: {
              create: [
                {
                  title: "Design intake questionnaire",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-8),
                },
                {
                  title: "Build consultation request form",
                  priority: "HIGH",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(2),
                },
                {
                  title: "Add email notification workflow",
                  priority: "MEDIUM",
                  status: "TODO",
                  dueDate: daysFromNow(8),
                },
              ],
            },
          },
          {
            name: "Document Repository",
            description:
              "Internal document tracking system for client files.",
            status: "CANCELLED",
            budget: "90000",
            deadline: daysFromNow(-5),
            tasks: {
              create: [
                {
                  title: "Gather repository requirements",
                  priority: "MEDIUM",
                  status: "DONE",
                  dueDate: daysFromNow(-15),
                },
                {
                  title: "Prepare architecture proposal",
                  priority: "LOW",
                  status: "DONE",
                  dueDate: daysFromNow(-12),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-SL-001",
            amount: "70000",
            status: "SENT",
            dueDate: daysFromNow(5),
          },
          {
            invoiceNo: "INV-SL-002",
            amount: "25000",
            status: "CANCELLED",
            dueDate: daysFromNow(-3),
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "GreenGrocer",
      company: "GreenGrocer Market",
      email: "orders@greengrocer.co.ke",
      phone: "+254700000005",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "E-commerce Storefront",
            description:
              "Online store for grocery orders, checkout, and delivery requests.",
            status: "ACTIVE",
            budget: "220000",
            deadline: daysFromNow(45),
            tasks: {
              create: [
                {
                  title: "Create product catalog model",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-5),
                },
                {
                  title: "Build cart flow",
                  priority: "URGENT",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(-1),
                },
                {
                  title: "Integrate checkout",
                  priority: "URGENT",
                  status: "TODO",
                  dueDate: daysFromNow(4),
                },
                {
                  title: "Add order confirmation email",
                  priority: "MEDIUM",
                  status: "TODO",
                  dueDate: daysFromNow(11),
                },
              ],
            },
          },
          {
            name: "Inventory Admin Panel",
            description:
              "Internal admin tool for stock tracking and product updates.",
            status: "ACTIVE",
            budget: "130000",
            deadline: daysFromNow(60),
            tasks: {
              create: [
                {
                  title: "Build product CRUD",
                  priority: "HIGH",
                  status: "REVIEW",
                  dueDate: daysFromNow(7),
                },
                {
                  title: "Add low-stock indicators",
                  priority: "MEDIUM",
                  status: "TODO",
                  dueDate: daysFromNow(15),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-GG-001",
            amount: "80000",
            status: "PAID",
            dueDate: daysFromNow(-8),
          },
          {
            invoiceNo: "INV-GG-002",
            amount: "120000",
            status: "SENT",
            dueDate: daysFromNow(20),
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "Mavuno Fitness",
      company: "Mavuno Fitness Studio",
      email: "hello@mavunofitness.co.ke",
      phone: "+254700000006",
      workspaceId: workspace.id,
      projects: {
        create: [
          {
            name: "Membership Booking Portal",
            description:
              "Client portal for class bookings and membership inquiries.",
            status: "COMPLETED",
            budget: "110000",
            deadline: daysFromNow(-7),
            tasks: {
              create: [
                {
                  title: "Create class schedule UI",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-18),
                },
                {
                  title: "Build booking form",
                  priority: "HIGH",
                  status: "DONE",
                  dueDate: daysFromNow(-14),
                },
                {
                  title: "Connect admin notifications",
                  priority: "MEDIUM",
                  status: "DONE",
                  dueDate: daysFromNow(-10),
                },
              ],
            },
          },
          {
            name: "Trainer Dashboard",
            description:
              "Dashboard for trainers to view class signups and client notes.",
            status: "ACTIVE",
            budget: "100000",
            deadline: daysFromNow(22),
            tasks: {
              create: [
                {
                  title: "Design trainer dashboard layout",
                  priority: "MEDIUM",
                  status: "IN_PROGRESS",
                  dueDate: daysFromNow(4),
                },
                {
                  title: "Build class attendance table",
                  priority: "HIGH",
                  status: "TODO",
                  dueDate: daysFromNow(9),
                },
                {
                  title: "Add client notes section",
                  priority: "LOW",
                  status: "TODO",
                  dueDate: daysFromNow(17),
                },
              ],
            },
          },
        ],
      },
      invoices: {
        create: [
          {
            invoiceNo: "INV-MF-001",
            amount: "110000",
            status: "PAID",
            dueDate: daysFromNow(-9),
          },
          {
            invoiceNo: "INV-MF-002",
            amount: "50000",
            status: "SENT",
            dueDate: daysFromNow(12),
          },
        ],
      },
    },
  });

  console.log("Seeded CoreOps demo data successfully:");
  console.log({
    user: user.email,
    workspace: workspace.name,
    clients: 6,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });