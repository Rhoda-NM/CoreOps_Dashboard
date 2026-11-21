export type CreationKind = "client" | "project" | "task" | "invoice";
export type CreationOptions = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  members: { id: string; name: string; projectIds: string[] | null }[];
};
export type CreationResult = { success: true; id: string; message: string } | {
  success: false; message: string; fields?: Record<string, string>; reference?: string;
};
