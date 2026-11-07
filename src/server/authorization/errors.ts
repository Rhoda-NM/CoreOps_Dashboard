export class AccessError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", public readonly status = code === "UNAUTHENTICATED" ? 401 : code === "NOT_FOUND" ? 404 : code === "CONFLICT" ? 409 : 403) {
    super(code === "CONFLICT" ? "This change conflicts with the current workspace state." : "This resource is unavailable or you do not have permission.");
    this.name = "AccessError";
  }
}
