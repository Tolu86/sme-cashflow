"use client";

import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={onBackdrop}
    >
      <div
        ref={panelRef}
        className={cn(
          "max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200",
          maxWidth
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}