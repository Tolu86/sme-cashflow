import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { Spinner } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700",
        className
      )}
    >
      {icon && <div className="mb-3 text-zinc-400 dark:text-zinc-500">{icon}</div>}
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner className="h-8 w-8 text-emerald-500" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}