"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getDialogSnapshot, subscribeDialog, updateValidation, type SweetResult } from "@/lib/swal";
import { CheckCircle2, CircleHelp, Info, TriangleAlert, X, XCircle } from "lucide-react";

function cleanHtml(source: string) {
  if (typeof window === "undefined") return "";
  const parsed = new DOMParser().parseFromString(source, "text/html");
  parsed.querySelectorAll("script,iframe,object,embed,link,meta,style").forEach((node) => node.remove());
  parsed.body.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on") || ((attribute.name === "href" || attribute.name === "src") && /^\s*javascript:/i.test(attribute.value))) element.removeAttribute(attribute.name);
    });
  });
  return parsed.body.innerHTML;
}

export default function DialogHost() {
  const modal = useSyncExternalStore(subscribeDialog, getDialogSnapshot, () => null);
  const options = modal?.options;
  useEffect(() => { if (!modal) return; options?.didOpen?.(); const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && options?.showCancelButton !== false) modal.resolve({ isConfirmed: false, isDenied: false, isDismissed: true, dismiss: "escape" }); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [modal, options]);
  if (!modal || !options) return null;
  const activeModal = modal;
  const activeOptions = options;
  const Icon = activeOptions.icon === "success" ? CheckCircle2 : activeOptions.icon === "error" ? XCircle : activeOptions.icon === "warning" ? TriangleAlert : activeOptions.icon === "question" ? CircleHelp : Info;
  async function confirm() {
    updateValidation("");
    try {
      const value = activeOptions.preConfirm ? await activeOptions.preConfirm() : activeOptions.input ? (document.getElementById("fleetflow-dialog-select") as HTMLSelectElement | null)?.value : undefined;
      const current = getDialogSnapshot();
      if (!value && current?.validation) return;
      activeModal.resolve({ isConfirmed: true, isDenied: false, isDismissed: false, value } as SweetResult);
    } catch { updateValidation("Could not validate these details. Please try again."); }
  }
  function cancel() { activeModal.resolve({ isConfirmed: false, isDenied: false, isDismissed: true, dismiss: "cancel" }); }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && activeOptions.allowOutsideClick !== false) cancel(); }}><section className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" aria-label="Close dialog" onClick={cancel}><X size={17}/></button>{activeOptions.icon && <span className={`dialog-icon dialog-${activeOptions.icon}`}><Icon size={23}/></span>}{activeOptions.title && <h2 id="dialog-title">{activeOptions.title}</h2>}{activeOptions.text && <p className="dialog-text">{activeOptions.text}</p>}{activeOptions.html && <div className="dialog-html" dangerouslySetInnerHTML={{ __html: cleanHtml(activeOptions.html) }}/ >}{activeOptions.input === "select" && <select id="fleetflow-dialog-select" className="dialog-select" defaultValue={activeOptions.inputValue}>{Object.entries(activeOptions.inputOptions ?? {}).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}{activeModal.validation && <div className="dialog-validation" role="alert">{activeModal.validation}</div>}<div className={`dialog-actions ${activeOptions.reverseButtons ? "reverse" : ""}`}>{activeOptions.showCancelButton && <button className="dialog-cancel" onClick={cancel}>{activeOptions.cancelButtonText ?? "Cancel"}</button>}<button className="dialog-confirm" style={{ backgroundColor: activeOptions.confirmButtonColor ?? "#23292f" }} onClick={confirm}>{activeOptions.confirmButtonText ?? "OK"}</button></div></section></div>;
}
