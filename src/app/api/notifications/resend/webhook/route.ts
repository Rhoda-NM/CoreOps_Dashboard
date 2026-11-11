import { resendWebhookHandler } from "@/server/notifications/resend/webhook";
export const runtime="nodejs";
export const maxDuration=30;
export const dynamic="force-dynamic";
export const POST=resendWebhookHandler;
