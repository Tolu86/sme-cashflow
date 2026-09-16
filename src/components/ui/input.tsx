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
          <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {label}
          </label>
        )}
        <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {prefix && <span className="mr-2 text-zinc-500 dark:text-zinc-400">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-transparent text-sm outline-none placeholder:text-zinc-400",
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