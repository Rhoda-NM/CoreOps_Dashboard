"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { WorkspaceNavigation, type WorkspaceIdentity, type WorkspaceOption } from "./WorkspaceNavigation";

type Props = { workspace: WorkspaceIdentity; workspaces?: WorkspaceOption[]; role: string };
export function MobileNavigation({ workspace, workspaces, role }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    // Close synchronously before an existing Quick Add handler opens its overlay.
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const resized = () => { if (desktop.matches) close(); };
    desktop.addEventListener("change", resized);
    return () => desktop.removeEventListener("change", resized);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    if (!modal) return;
    const overflow = document.body.style.overflow;
    modal.showModal(); // Native top layer supplies inert background/focus containment.
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      modal.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return <div className="workspace-mobile-navigation">
    <button ref={trigger} type="button" className="workspace-menu-trigger" aria-label="Open workspace navigation" aria-expanded={open} aria-controls="workspace-mobile-navigation" onClick={() => { if (!window.matchMedia("(min-width: 1024px)").matches) setOpen(true); }}><Menu aria-hidden="true" size={20} /></button>
    <dialog ref={dialog} id="workspace-mobile-navigation" aria-label="Workspace navigation menu" aria-modal="true" className="workspace-drawer" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }} onKeyDown={event => {
      // Native modality makes the page inert. Explicitly wrap Tab endpoints as
      // well, so focus never drops to browser chrome/body between menu cycles.
      if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]"))
          .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
      // Preserve the existing global shortcut without stacking Quick Add behind a modal.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") close();
    }}>
      <WorkspaceNavigation workspace={workspace} workspaces={workspaces} role={role} label="Mobile workspace navigation" onNavigate={close} onQuickAdd={close} dismissControl={<button ref={closeButton} type="button" className="workspace-drawer-close" aria-label="Close workspace navigation" onClick={close}><X aria-hidden="true" size={20} /></button>} />
    </dialog>
  </div>;
}
