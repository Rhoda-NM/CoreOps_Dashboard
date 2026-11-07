import type { Role } from "@prisma/client";

// Deny by default. Job titles never grant permissions.
export const permissions = {
  "workspace:manage": ["OWNER"],
  "members:invite": ["OWNER"],
  "members:manage": ["OWNER"],
  "clients:read": ["OWNER", "MANAGER"],
  "clients:create": ["OWNER", "MANAGER"],
  "clients:update": ["OWNER", "MANAGER"],
  "projects:create": ["OWNER", "MANAGER"],
  "projects:update": ["OWNER", "MANAGER"],
  "projects:delete": ["OWNER"],
  "tasks:create": ["OWNER", "MANAGER"],
  "tasks:assign": ["OWNER", "MANAGER"],
  "invoices:read": ["OWNER"],
  "invoices:create": ["OWNER"],
  "invoices:update": ["OWNER"],
  "subscription:manage": ["OWNER"],
  "audit:read": ["OWNER"],
} as const;
export type Permission = keyof typeof permissions;
export function can(role: Role, permission: Permission): boolean {
  const roles: readonly Role[] = permissions[permission] ?? [];
  return roles.includes(role);
}
