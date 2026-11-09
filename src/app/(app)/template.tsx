"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Unlike a layout, a Next.js template is remounted for route navigation.
 * That restarts the entrance animation reliably when switching workspace tabs.
 *
 * Animate opacity here (not transform): keeping a transform on an ancestor
 * can interfere with the fixed-position dialogs used throughout this app.
 */
export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.55, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
