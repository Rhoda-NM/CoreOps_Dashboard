import { exportCleanupHandler } from "@/server/data-access/cleanup-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = exportCleanupHandler;
