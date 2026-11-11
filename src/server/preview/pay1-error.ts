import { AccessError } from "../authorization/errors";
export type Pay1Failure = "PAY1_REGISTRATION_UNAVAILABLE" | "PAY1_CONFIGURATION_REQUIRED" | "PAY1_SCHEMA_REQUIRED" | "PAY1_ADMISSION_REQUIRED" | "PAY1_ADMISSION_UNAVAILABLE" | "PAY1_TARGET_MISMATCH" | "PAY1_WINDOW_CLOSED" | "PAY1_ACTOR_NOT_ADMITTED";
// Closed, nonsecret reasons only. Never include targets, actor IDs or exceptions.
export class Pay1AdmissionError extends AccessError {
  constructor(public readonly reason: Pay1Failure) { super("FORBIDDEN"); this.name = "Pay1AdmissionError"; }
}
