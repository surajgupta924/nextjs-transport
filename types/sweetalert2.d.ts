declare module "sweetalert2" {
  type Result<T> = { isConfirmed: boolean; isDenied: boolean; isDismissed: boolean; value?: T; dismiss?: string };
  interface Options<T> {
    title?: string;
    text?: string;
    html?: string;
    icon?: "success" | "error" | "warning" | "info" | "question";
    input?: "select" | "text" | "email" | "password";
    inputOptions?: Record<string, string>;
    inputValue?: string;
    showCancelButton?: boolean;
    allowOutsideClick?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    reverseButtons?: boolean;
    confirmButtonColor?: string;
    customClass?: Record<string, string>;
    focusConfirm?: boolean;
    preConfirm?: () => T | undefined | Promise<T | undefined>;
    didOpen?: () => void;
  }
  const Swal: {
    fire<T = unknown>(options?: Options<T>): Promise<Result<T>>;
    showValidationMessage(message: string): void;
  };
  export default Swal;
}
