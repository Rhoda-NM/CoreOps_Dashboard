import "server-only";
import type { Prisma } from "@prisma/client";
export async function lifecycleNow(tx: Prisma.TransactionClient) {
  // clock_timestamp(), unlike transaction_timestamp(), observes time after a lock wait.
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}
