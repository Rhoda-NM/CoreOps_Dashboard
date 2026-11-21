export type InvitationView = {
  state: "SIGN_IN" | "READY" | "WRONG_ACCOUNT" | "EXPIRED" | "UNAVAILABLE" | "SUSPENDED" | "RESTRICTED" | "ACCEPTED" | "ACCOUNT_UNAVAILABLE";
  maskedEmail?: string;
  expiresAt?: string;
  // Full details are returned only after live verified recipient matching.
  workspaceName?: string;
  role?: "OWNER" | "MANAGER" | "STAFF";
  email?: string;
  continuation?: string;
};
export type InvitationAcceptanceState = { message: string; view?: InvitationView };
