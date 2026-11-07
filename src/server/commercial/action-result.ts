import { CommercialError } from "./policy";
import { AccessError } from "../authorization/errors";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
export function commercialMessage(error: unknown) {
  if (error instanceof CommercialError || error instanceof AccessError) return error.message;
  if (error instanceof ZodError) return "Check the required fields and use valid amounts, dates, and references.";
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "An open request or payment reference already exists. Refresh to review its status.";
  return "Unable to complete this change. Refresh and retry, or contact support.";
}
