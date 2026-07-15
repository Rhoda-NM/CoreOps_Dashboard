import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not loaded. Check your project root .env file."
  );
}

import { db } from "../src/server/db/prisma";

function createWorkspaceSlug(name: string, workspaceId: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeBaseSlug = baseSlug || "workspace";
  const uniqueSuffix = workspaceId.slice(-6).toLowerCase();

  return `${safeBaseSlug}-${uniqueSuffix}`;
}

async function backfillWorkspaceSlugs() {
  const workspaces = await db.workspace.findMany({
    where: {
      slug: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`Found ${workspaces.length} workspaces without slugs.`);

  for (const workspace of workspaces) {
    const slug = createWorkspaceSlug(workspace.name, workspace.id);

    await db.workspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        slug,
      },
    });

    console.log(`✓ Workspace "${workspace.name}" → ${slug}`);
  }

  return workspaces.length;
}

async function backfillProjectWorkspaceIds() {
  const projects = await db.project.findMany({
    where: {
      workspaceId: null,
    },
    select: {
      id: true,
      name: true,
      client: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  console.log(
    `Found ${projects.length} projects without workspace ownership.`
  );

  for (const project of projects) {
    const workspaceId = project.client.workspaceId;

    if (!workspaceId) {
      throw new Error(
        `Cannot backfill project "${project.name}" (${project.id}) because its client has no workspace.`
      );
    }

    await db.project.update({
      where: {
        id: project.id,
      },
      data: {
        workspaceId,
      },
    });

    console.log(`✓ Project "${project.name}" assigned to ${workspaceId}`);
  }

  return projects.length;
}

async function backfillTaskWorkspaceIds() {
  const tasks = await db.task.findMany({
    where: {
      workspaceId: null,
    },
    select: {
      id: true,
      title: true,
      project: {
        select: {
          id: true,
          workspaceId: true,
        },
      },
    },
  });

  console.log(`Found ${tasks.length} tasks without workspace ownership.`);

  for (const task of tasks) {
    const workspaceId = task.project.workspaceId;

    if (!workspaceId) {
      throw new Error(
        `Cannot backfill task "${task.title}" (${task.id}) because project ${task.project.id} has no workspace.`
      );
    }

    await db.task.update({
      where: {
        id: task.id,
      },
      data: {
        workspaceId,
      },
    });

    console.log(`✓ Task "${task.title}" assigned to ${workspaceId}`);
  }

  return tasks.length;
}

async function backfillInvoiceWorkspaceIds() {
  const invoices = await db.invoice.findMany({
    where: {
      workspaceId: null,
    },
    select: {
      id: true,
      invoiceNo: true,
      projectId: true,
      client: {
        select: {
          workspaceId: true,
        },
      },
      project: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  console.log(
    `Found ${invoices.length} invoices without workspace ownership.`
  );

  for (const invoice of invoices) {
    const clientWorkspaceId = invoice.client.workspaceId;
    const projectWorkspaceId = invoice.project?.workspaceId;

    if (!clientWorkspaceId) {
      throw new Error(
        `Cannot backfill invoice "${invoice.invoiceNo}" (${invoice.id}) because its client has no workspace.`
      );
    }

    if (
      invoice.projectId &&
      projectWorkspaceId &&
      projectWorkspaceId !== clientWorkspaceId
    ) {
      throw new Error(
        `Invoice "${invoice.invoiceNo}" belongs to a client and project from different workspaces.`
      );
    }

    await db.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        workspaceId: clientWorkspaceId,
      },
    });

    console.log(
      `✓ Invoice "${invoice.invoiceNo}" assigned to ${clientWorkspaceId}`
    );
  }

  return invoices.length;
}

async function verifyBackfill() {
  const [
    workspacesWithoutSlug,
    projectsWithoutWorkspace,
    tasksWithoutWorkspace,
    invoicesWithoutWorkspace,
  ] = await Promise.all([
    db.workspace.count({
      where: {
        slug: null,
      },
    }),
    db.project.count({
      where: {
        workspaceId: null,
      },
    }),
    db.task.count({
      where: {
        workspaceId: null,
      },
    }),
    db.invoice.count({
      where: {
        workspaceId: null,
      },
    }),
  ]);

  const failures = {
    workspacesWithoutSlug,
    projectsWithoutWorkspace,
    tasksWithoutWorkspace,
    invoicesWithoutWorkspace,
  };

  const hasFailures = Object.values(failures).some((count) => count > 0);

  if (hasFailures) {
    console.error("\nBackfill verification failed:", failures);

    throw new Error(
      "Some records still do not have the required workspace scope."
    );
  }

  console.log("\n✓ Verification passed.");
  console.log("Every workspace has a slug.");
  console.log("Every project has a workspace.");
  console.log("Every task has a workspace.");
  console.log("Every invoice has a workspace.");
}

async function main() {
  console.log("Starting workspace scope backfill...\n");

  /*
   * The order is important:
   *
   * 1. Workspace slugs
   * 2. Projects inherit workspace from clients
   * 3. Tasks inherit workspace from projects
   * 4. Invoices inherit workspace from clients
   */
  const workspaceCount = await backfillWorkspaceSlugs();
  const projectCount = await backfillProjectWorkspaceIds();
  const taskCount = await backfillTaskWorkspaceIds();
  const invoiceCount = await backfillInvoiceWorkspaceIds();

  await verifyBackfill();

  console.log("\nWorkspace scope backfill completed successfully.");
  console.log({
    updatedWorkspaces: workspaceCount,
    updatedProjects: projectCount,
    updatedTasks: taskCount,
    updatedInvoices: invoiceCount,
  });
}

main()
  .catch((error) => {
    console.error("\nWorkspace scope backfill failed.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });