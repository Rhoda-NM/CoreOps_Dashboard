"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createRecord, creationOptions } from "./actions";
import type { CreationKind, CreationOptions, CreationResult } from "./types";

const labels = { client: "Client", project: "Project", task: "Task", invoice: "Invoice" };
const emptyOptions: CreationOptions = { clients: [], projects: [], members: [] };
export type CreationProps = { kind: CreationKind; clientId?: string; projectId?: string; initialOpen?: boolean };

export function CreationForm({ kind, clientId: contextClient, projectId: contextProject, initialOpen = false }: CreationProps) {
  const [open, setOpen] = useState(initialOpen);
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" data-variant="primary" className="ui-button rounded-lg bg-core-primary px-4 py-2 text-sm font-medium text-white hover:bg-core-primary-hover" onClick={() => setOpen(true)}>New {labels[kind]}</button>
    {notice && <p role="status" className="mt-2 text-sm text-core-text-secondary">{notice}</p>}
    {open && <CreationPanel kind={kind} clientId={contextClient} projectId={contextProject} onClose={(message) => {
      setOpen(false); if (message) setNotice(message); requestAnimationFrame(() => trigger.current?.focus());
    }} />}
  </>;
}

function CreationPanel({ kind, clientId: contextClient, projectId: contextProject, onClose }: CreationProps & { onClose: (message?: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [options, setOptions] = useState<CreationOptions>(emptyOptions);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [clientId, setClientId] = useState(contextClient || "");
  const [projectId, setProjectId] = useState(contextProject || "");
  const [inlineClient, setInlineClient] = useState(false);
  const [savedClient, setSavedClient] = useState("");
  const [result, setResult] = useState<CreationResult | null>(null);
  const router = useRouter();
  const prefix = useId();
  const title = `${inlineClient ? "New Client for Project" : `New ${labels[kind]}`}`;
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    let current = true;
    creationOptions(kind).then(response => {
      if (!current) return;
      if (response.success) { setOptions(response.options); setLoaded(true); setLoadError(""); }
      else setLoadError(response.message);
    }).catch(() => { if (current) setLoadError("Unable to load this form. Check your connection and try again."); });
    return () => { current = false; };
  }, [kind, attempt]);
  useEffect(() => {
    if (loaded) formRef.current?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea")?.focus();
  }, [loaded, inlineClient]);
  const fields = result && !result.success ? result.fields || {} : {};
  const field = (name: string, label: string, config: { type?: string; required?: boolean; hint?: string; options?: { id: string; name: string }[]; value?: string; onChange?: (value: string) => void; defaultValue?: string } = {}) => {
    const id = `${prefix}-${name}`;
    const props = { id, name, required: config.required, "aria-invalid": !!fields[name], "aria-describedby": `${id}-hint ${id}-error` };
    return <div className="creation-field" key={name}>
      <label htmlFor={id}>{label}{!config.required && <span className="font-normal text-core-text-secondary"> (optional)</span>}</label>
      {config.options ? <select {...props} defaultValue={config.defaultValue} value={config.value} onChange={e => config.onChange?.(e.target.value)}><option value="">{config.required ? `Choose ${label.toLowerCase()}` : "None"}</option>{config.options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        : name === "description" ? <textarea {...props} rows={3} />
        : <input {...props} type={config.type || "text"} defaultValue={config.defaultValue} {...(config.type === "number" ? { min: "0", step: "any", inputMode: "decimal" as const } : {})} />}
      <span id={`${id}-hint`} className="text-xs text-core-text-secondary">{config.hint}</span>
      <span id={`${id}-error`} className="text-sm text-red-700">{fields[name]}</span>
    </div>;
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !loaded) return;
    busy.current = true; setPending(true); setResult(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await createRecord(inlineClient ? "client" : kind, data);
      if (response.success) {
        if (inlineClient) {
          const name = String(data.get("name"));
          setOptions(previous => ({ ...previous, clients: [...previous.clients, { id: response.id, name }] }));
          setClientId(response.id); setSavedClient(`Client “${name}” saved. Your project has not been saved yet.`); setInlineClient(false);
        } else { onClose(response.message); router.refresh(); }
      } else {
        setResult(response);
        requestAnimationFrame(() => {
          const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]");
          (first || formRef.current?.querySelector<HTMLElement>("[role=alert]"))?.focus();
        });
      }
    } catch { setResult({ success: false, message: "Connection interrupted. Your values are retained. Check whether the record was saved before retrying." }); }
    finally { busy.current = false; setPending(false); }
  }
  // Inline client fields stay separately mounted from the project fields, preserving
  // project values. A successful child is selected once; project retries never recreate it.
  if (typeof document === "undefined") return null;
  return createPortal(<div className="workspace-theme">
    <dialog ref={dialog} aria-labelledby={`${prefix}-heading`} className="creation-dialog" onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex='0']")].filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }} onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }}>
      <div className="creation-heading"><h2 id={`${prefix}-heading`}>{title}</h2><p>Fields marked optional can be filled in later.</p></div>
      {!loaded ? <div className="creation-content"><p role={loadError ? "alert" : "status"}>{loadError || "Loading available records…"}</p>{loadError && <Button type="button" onClick={() => setAttempt(n => n + 1)}>Try again</Button>}<Button type="button" variant="secondary" onClick={() => onClose()}>Cancel</Button></div> : <form ref={formRef} onSubmit={submit} className="creation-form">
        <div className="creation-content">
          {savedClient && <p role="status" className="creation-note">{savedClient} Keep this client selected when retrying.</p>}
          {result && !result.success && <p role="alert" tabIndex={-1} className="creation-error">{result.message}{result.reference && <small className="block">Support reference: {result.reference}</small>}</p>}
          <fieldset disabled={pending} hidden={!inlineClient && kind !== "client"}>
            {(kind === "client" || inlineClient) && <>{field("name", "Client or primary contact name", { required: true, hint: "Use a business name, or the person's name if they are your main contact." })}{field("company", "Company / organization", { hint: "For a person, add their organization if relevant." })}{field("email", "Email", { type: "email" })}{field("phone", "Phone", { type: "tel" })}</>}
          </fieldset>
          {kind !== "client" && <fieldset disabled={pending || inlineClient} hidden={inlineClient}>
            {(kind === "project" || kind === "invoice") && (contextClient ? <><input type="hidden" name="clientId" value={contextClient} /><p className="creation-note">Client: {options.clients.find(c => c.id === contextClient)?.name || "Selected client"}</p></> : <>
              {field("clientId", "Client", { required: true, options: options.clients, value: clientId, onChange: value => { setClientId(value); setProjectId(""); } })}
              {kind === "project" && <Button type="button" variant="secondary" onClick={() => { setResult(null); setInlineClient(true); }}>Add a new client</Button>}
              {!options.clients.length && kind === "invoice" && <p>No clients yet. Create a client on the Clients page first.</p>}
            </>)}
            {kind === "task" && (contextProject ? <><input type="hidden" name="projectId" value={contextProject} /><p className="creation-note">Project: {options.projects.find(p => p.id === contextProject)?.name || "Selected project"}</p></> : field("projectId", "Project", { required: true, options: options.projects, value: projectId, onChange: setProjectId }))}
            {kind === "task" && !options.projects.length && <p>No projects yet. Create a project on the Projects page first.</p>}
            {kind === "invoice" && field("projectId", "Project", { options: options.projects.filter(p => p.clientId === clientId), value: projectId, onChange: setProjectId })}
            {kind === "project" && <>{field("name", "Project name", { required: true })}{field("description", "Description")}{field("deadline", "Deadline", { type: "date" })}{field("budget", "Budget", { type: "number" })}</>}
            {kind === "task" && <>{field("title", "Task title", { required: true })}{field("description", "Description")}{field("priority", "Priority", { required: true, options: ["LOW", "MEDIUM", "HIGH", "URGENT"].map(id => ({ id, name: id })), defaultValue: "MEDIUM" })}{field("dueDate", "Due date", { type: "date" })}
              <TeammateField key={projectId} id={`${prefix}-assignee`} members={options.members.filter(m => m.projectIds === null || m.projectIds.includes(projectId))} />
            </>}
            {kind === "invoice" && <>{field("invoiceNo", "Invoice number", { required: true })}{field("amount", "Amount", { type: "number", required: true })}{field("dueDate", "Due date", { type: "date" })}<p className="text-sm text-core-text-secondary">The invoice will be marked Sent. Saving does not email it or record a payment.</p></>}
          </fieldset>}
        </div>
        <footer className="creation-footer">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => { if (inlineClient) { setInlineClient(false); setResult(null); } else onClose(); }}>{inlineClient ? "Back to project" : "Cancel"}</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : `Save ${inlineClient ? "Client" : labels[kind]}`}</Button>
        </footer>
      </form>}
    </dialog>
  </div>, document.body);
}
function TeammateField({ id, members }: { id: string; members: CreationOptions["members"] }) {
  return <div className="creation-field"><label htmlFor={id}>Assign teammate <span>(optional)</span></label><select id={id} name="assignedMemberId"><option value="">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><p className="text-xs text-core-text-secondary">Only active teammates eligible for this project are shown.</p></div>;
}
