import { notificationCaptureHandler } from "@/server/notifications/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = notificationCaptureHandler;
