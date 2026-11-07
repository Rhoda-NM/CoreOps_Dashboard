import { AccessError } from "../authorization/errors";
export type IdentityFailure = "VERIFICATION_REQUIRED" | "IDENTITY_CONFLICT" | "ACCOUNT_UNAVAILABLE" | "SESSION_UNAVAILABLE" | "PROVIDER_UNAVAILABLE" | "LEGAL_ACCEPTANCE_REQUIRED";
export class IdentityError extends AccessError {
  constructor(public readonly reason: IdentityFailure) {
    super(reason === "IDENTITY_CONFLICT" ? "CONFLICT" : "FORBIDDEN");
    this.name = "IdentityError";
  }
}
