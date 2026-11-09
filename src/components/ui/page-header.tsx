"use client";

import { Activity } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description?: string;
}

/**
 * Dashboard-matched header, with a distinct slide-and-fade entrance.
 * The route template remounts this component on navigation.
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.55,
        delay: reducedMotion ? 0 : 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative overflow-hidden rounded-[28px] bg-[#0e2130] px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
          <Activity size={13} aria-hidden="true" /> Financial workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            {description}
          </p>
        )}
      </div>
    </motion.section>
  );
}
