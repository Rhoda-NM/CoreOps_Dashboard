import type { ProjectStatus, TaskStatus } from "@prisma/client";

export type DeliveryProject = {
  id: string;
  status: ProjectStatus;
  deadline: Date | null;
  tasks: { id: string; status: TaskStatus; dueDate: Date | null; assignedMemberId: string | null }[];
};
export type DeliveryRule = "TASK_OVERDUE" | "TASK_UNASSIGNED" | "PROJECT_DEADLINE_PASSED";
export type DeliveryFinding = {
  ruleId: DeliveryRule;
  explanation: string;
  projectId: string;
  taskId: string | null;
  href: string;
  projectStatus: ProjectStatus;
  taskStatus: TaskStatus | null;
  dueDate: string | null;
  deadline: string | null;
  assignedMemberId: string | null;
  evaluatedAt: string;
};

// No I/O or text interpretation. Read the clock once; equality is not overdue.
export function evaluateDelivery(project: DeliveryProject, projectHref: string, clock: () => Date) {
  const now = clock();
  const evaluatedAt = now.toISOString();
  const findings: DeliveryFinding[] = [];
  const seen = new Set<string>();
  function add(ruleId: DeliveryRule, explanation: string, task?: DeliveryProject["tasks"][number]) {
    const key = JSON.stringify([ruleId, task?.id ?? project.id]);
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ ruleId, explanation, projectId: project.id, taskId: task?.id ?? null,
      href: task ? `${projectHref}#task-${encodeURIComponent(task.id)}` : projectHref,
      projectStatus: project.status, taskStatus: task?.status ?? null,
      dueDate: task?.dueDate?.toISOString() ?? null, deadline: project.deadline?.toISOString() ?? null,
      assignedMemberId: task?.assignedMemberId ?? null, evaluatedAt });
  }
  if (project.status === "ACTIVE") {
    for (const task of [...project.tasks].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      if (task.status === "DONE") continue;
      if (task.dueDate && task.dueDate < now) add("TASK_OVERDUE", "This unfinished task's due date has passed.", task);
      if (task.assignedMemberId === null) add("TASK_UNASSIGNED", "This unfinished task has no assignee.", task);
    }
    if (project.deadline && project.deadline < now) add("PROJECT_DEADLINE_PASSED", "This active project's deadline has passed.");
  }
  return { projectId: project.id, projectStatus: project.status, evaluatedAt, findings };
}
