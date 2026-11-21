import { getAuditActivity } from "@/server/services/activity.service";
import { ActivityHistory } from "@/features/activity/ActivityHistory";
export const dynamic = "force-dynamic";
export default async function ActivityPage() {
  const page = await getAuditActivity();
  return <ActivityHistory key={page.scopeKey} initialPage={page} />;
}
