import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("input", className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("textarea", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("select", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={htmlFor} className="form-label">
        {label}{required && <span className="text-accent"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, className, ...props }, ref) => (
    <label className="flex items-center gap-2.5 cursor-pointer select-none py-1.5">
      <input ref={ref} type="checkbox" className={cn("h-4 w-4 rounded border-border-strong accent-accent", className)} {...props} />
      <span className="text-sm text-ink">{label}</span>
    </label>
  )
);
CheckboxField.displayName = "CheckboxField";
