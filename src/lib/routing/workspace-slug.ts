// DNS labels and infrastructure reservations are shared by allocation, host
// classification and URL construction. This module has no request authority.
export const RESERVED_WORKSPACE_SLUGS = new Set([
  "app", "www", "api", "admin", "platform", "auth", "accounts", "account",
  "login", "security", "sign-in", "sign-up", "clerk", "mail", "email", "smtp", "imap", "pop", "support", "status",
  "billing", "payments", "webhooks", "cdn", "assets", "static", "media",
  "docs", "help", "preview", "staging", "stage", "dev", "development",
  "test", "testing", "production", "localhost", "ftp", "ns1", "ns2",
  "autodiscover", "autoconfig", "workflowconnect", "vercel",
]);
export function workspaceSlugProblem(value: unknown): string | null {
  if (typeof value !== "string" || !value) return "missing";
  if (value.length > 63) return "too-long";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) return "invalid-dns-label";
  if (value.startsWith("xn--")) return "idn-not-supported";
  if (RESERVED_WORKSPACE_SLUGS.has(value)) return "reserved";
  return null;
}
export const SELECTED_SLUG_MIN_LENGTH = 3;
export const SELECTED_SLUG_MAX_LENGTH = 63;
export function selectedWorkspaceSlugMessage(value: unknown): string | null {
  const problem = workspaceSlugProblem(value);
  if (problem === "reserved") return "This address is reserved. Please choose another.";
  if (typeof value === "string" && value.length < SELECTED_SLUG_MIN_LENGTH) return "Use at least 3 characters.";
  if (problem === "too-long") return "Use no more than 63 characters.";
  if (problem) return "Use lowercase letters, numbers and hyphens, with no hyphen at either end.";
  return null;
}
export function suggestWorkspaceSlug(name: string): string {
  let base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/, "");
  if (base.length < 3 || base.startsWith("xn--")) base = "workspace";
  if (RESERVED_WORKSPACE_SLUGS.has(base)) base = `${base}-workspace`;
  return base;
}
export function assertWorkspaceSlug(value: string): string {
  if (workspaceSlugProblem(value)) throw new Error("Invalid workspace slug.");
  return value;
}
export function generateWorkspaceSlug(name: string, entropy: string): string {
  if (!/^[a-f0-9]{8}$/.test(entropy)) throw new Error("Invalid slug entropy.");
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Leave room for the separator and suffix. Slugs remain immutable and
  // automatically assigned; a business name is not a customer-chosen hostname.
  let label = base.slice(0, 54).replace(/-+$/, "") || "workspace";
  if (label.startsWith("xn--")) label = "workspace";
  return assertWorkspaceSlug(`${label}-${entropy}`);
}
export function auditWorkspaceSlugs(records: { id: string; slug: string | null }[]) {
  const seen = new Map<string, string>();
  const problems: { workspaceId: string; problem: string }[] = [];
  for (const record of records) {
    const problem = workspaceSlugProblem(record.slug);
    if (problem) problems.push({ workspaceId: record.id, problem });
    if (record.slug) {
      const normalized = record.slug.toLowerCase();
      const other = seen.get(normalized);
      if (other) problems.push({ workspaceId: record.id, problem: `case-insensitive-collision:${other}` });
      else seen.set(normalized, record.id);
    }
  }
  return { checked: records.length, problems };
}
