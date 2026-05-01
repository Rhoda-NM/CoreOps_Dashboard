import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getDashboardMetrics() {
  const workspaceId = await getCurrentWorkspaceId();

  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const [
    totalClients,
    activeProjects,
    pendingTasks,
    overdueTasks,
    revenueThisMonth,
    outstandingInvoices,
    recentProjects,
    recentTasks,
    recentInvoices,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
    }),

    prisma.project.count({
      where: {
        status: "ACTIVE",
        client: {
          workspaceId,
        },
      },
    }),

    prisma.task.count({
      where: {
        status: {
          not: "DONE",
        },
        project: {
          client: {
            workspaceId,
          },
        },
      },
    }),

    prisma.task.count({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          not: "DONE",
        },
        project: {
          client: {
            workspaceId,
          },
        },
      },
    }),

    prisma.invoice.aggregate({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        client: {
          workspaceId,
        },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.invoice.aggregate({
      where: {
        status: {
          not: "PAID",
        },
        client: {
          workspaceId,
        },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.project.findMany({
      where: {
        client: {
          workspaceId,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    }),

    prisma.task.findMany({
      where: {
        project: {
          client: {
            workspaceId,
          },
        },
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    }),

    prisma.invoice.findMany({
      where: {
        client: {
          workspaceId,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    }),
  ]);

  return {
    totalClients,
    activeProjects,
    pendingTasks,
    overdueTasks,
    revenueThisMonth: Number(revenueThisMonth._sum.amount || 0),
    outstandingInvoices: Number(outstandingInvoices._sum.amount || 0),
    recentProjects,
    recentTasks,
    recentInvoices,
  };
}