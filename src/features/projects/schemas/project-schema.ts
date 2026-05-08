import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.string().optional(),
});

export const updateProjectSchema = projectSchema.extend({
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;