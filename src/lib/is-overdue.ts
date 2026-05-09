export function isOverdue(dueDate: Date | string | null, status?: string) {
  if (!dueDate) return false;
  if (status === "DONE") return false;

  const today = new Date();
  const due = new Date(dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}