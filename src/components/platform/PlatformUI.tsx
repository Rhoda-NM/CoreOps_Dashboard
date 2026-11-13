import { Inbox } from "lucide-react";
export function PageHeader({ eyebrow = "Platform management", title, description, children }: { eyebrow?: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="platform-page-header"><div><p className="platform-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children && <div className="platform-header-actions">{children}</div>}</header>;
}
export function StatusBadge({ status }: { status: string }) {
  const positive = ["ACTIVE", "ACTIVATED", "CONFIRMED", "RECONCILED", "APPROVED", "PUBLISHED", "AVAILABLE"];
  const negative = ["SUSPENDED", "REVOKED", "REJECTED", "FAILED", "CLOSED", "REVERSED"];
  const tone = positive.includes(status) ? "positive" : negative.includes(status) ? "negative" : "neutral";
  return <span className={`platform-badge platform-badge-${tone}`}><i aria-hidden="true"/>{status.replaceAll("_", " ").toLowerCase()}</span>;
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="platform-empty"><span><Inbox size={25}/></span><h2>{title}</h2><p>{description}</p></div>;
}
export function DataTable({ caption, headers, children }: { caption: string; headers: string[]; children: React.ReactNode }) {
  return <div className="platform-table-scroll" tabIndex={0} role="region" aria-label={`${caption} table`}><table className="platform-table"><caption className="sr-only">{caption}</caption><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function ReviewPanel({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return <details className={`platform-review${danger ? " platform-review-danger" : ""}`}><summary>{title}<span aria-hidden="true">+</span></summary><div>{children}</div></details>;
}
export const date = (value: Date | string | null | undefined) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "—";
export const money = (value: { toFixed: (n: number) => string } | null | undefined, currency = "KES") => value ? `${currency} ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : "By quotation";
