export function Field({ label, name, type = "text", value, required = true }: { label: string; name: string; type?: string; value?: string; required?: boolean }) {
  return <label className="block text-sm text-core-muted">{label}<input name={name} type={type} defaultValue={value} required={required} className="mt-1 block w-full rounded-lg border border-core-border bg-core-bg px-3 py-2 text-core-text" /></label>;
}
export function Select({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return <label className="block text-sm text-core-muted">{label}<select name={name} className="mt-1 block w-full rounded-lg border border-core-border bg-core-bg px-3 py-2 text-core-text">{children}</select></label>;
}
export const panel = "rounded-2xl border border-core-border bg-core-card p-6 space-y-4";
