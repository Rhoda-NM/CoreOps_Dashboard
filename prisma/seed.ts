// prisma/seed.ts
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

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

  console.log("Seeded:", { user, workspace });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });