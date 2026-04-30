import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;