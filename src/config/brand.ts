export const brand = {
  name: "WorkflowConnect",
  promise: "Your business, connected.",
  description: "WorkflowConnect brings clients, projects, tasks, teams, and business operations together in one organized workspace.",
  company: "Stravect Systems",
} as const;

// No proposed domain is a canonical until the operator verifies ownership.
export function canonicalOrigin() {
  const value = process.env.COREOPS_CANONICAL_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") return undefined;
    return url.origin;
  } catch { return undefined; }
}
export function indexingEnabled() {
  return !!canonicalOrigin() && process.env.COREOPS_PUBLIC_INDEXING_ENABLED === "true" && process.env.VERCEL_ENV !== "preview";
}
