"use client";

import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout, profile } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {profile?.displayName ?? user?.displayName ?? user?.email?.split("@")[0]}
          </p>
          <p className="text-xs text-zinc-500">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}