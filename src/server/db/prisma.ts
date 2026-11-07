import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to your project root .env file.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaSignature?: string;
};

// Next preserves globals during hot reload. Reuse a pool only when it was
// created from the same generated schema and Prisma version as this module.
const schemaSignature = JSON.stringify({
  version: Prisma.prismaVersion.client,
  datamodel: Prisma.dmmf.datamodel,
  connectionString,
});
const cachedClient = globalForPrisma.prisma;
const canReuse = process.env.NODE_ENV !== "production" &&
  globalForPrisma.prismaSchemaSignature === schemaSignature;

export const prisma = canReuse && cachedClient
  ? cachedClient
  : new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSignature = schemaSignature;
  if (cachedClient && cachedClient !== prisma) {
    void cachedClient.$disconnect().catch(() => {
      console.warn("Unable to close the previous development database client.");
    });
  }
}
