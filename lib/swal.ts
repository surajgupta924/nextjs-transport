"use client";

export type SweetResult<T = unknown> = { isConfirmed: boolean; isDenied: boolean; isDismissed: boolean; value?: T; dismiss?: string };
export type SweetOptions<T = unknown> = {
  title?: string; text?: string; html?: string; icon?: "success" | "error" | "warning" | "info" | "question";
  input?: "select" | "text" | "email" | "password"; inputOptions?: Record<string, string>; inputValue?: string;
  showCancelButton?: boolean; allowOutsideClick?: boolean; confirmButtonText?: string; cancelButtonText?: string;
  reverseButtons?: boolean; confirmButtonColor?: string; customClass?: Record<string, string>; focusConfirm?: boolean;
  preConfirm?: () => T | undefined | Promise<T | undefined>; didOpen?: () => void;
};

type ModalState = { options: SweetOptions<any>; resolve: (result: SweetResult<any>) => void; validation: string } | null;
let state: ModalState = null;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
export function subscribeDialog(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getDialogSnapshot() { return state; }
export function updateValidation(message: string) { if (state) { state = { ...state, validation: message }; notify(); } }

const Swal = {
  fire<T = unknown>(options: SweetOptions<T> = {}): Promise<SweetResult<T>> {
    if (typeof window === "undefined") return Promise.resolve({ isConfirmed: false, isDenied: false, isDismissed: true, dismiss: "server" });
    if (state) state.resolve({ isConfirmed: false, isDenied: false, isDismissed: true, dismiss: "replaced" });
    return new Promise<SweetResult<T>>((resolve) => {
      const finish = (result: SweetResult<T>) => {
        if (state?.resolve === finish) { state = null; notify(); }
        resolve(result);
      };
      state = { options, resolve: finish, validation: "" }; notify();
    });
  },
  showValidationMessage(message: string) { updateValidation(message); },
};

export default Swal;
