import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "inputMode"> {
  label?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
          {prefix && <span className="mr-2 text-zinc-500 dark:text-zinc-400">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400",
              prefix ? "pl-0" : undefined,
              className
            )}
            {...props}
          />
          {suffix && <span className="ml-2 text-zinc-500 dark:text-zinc-400">{suffix}</span>}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";