"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Bot, User, Sparkles } from "lucide-react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/button";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much did I spend this month?",
  "When will I run out of cash?",
  "What are my biggest expenses?",
  "How can I improve my cash flow?",
];

export function CopilotChat() {
  const { business } = useBusiness();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !business?.id || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const token = await getIdToken(auth!.currentUser!);
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: business.id, message: trimmed, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "unknown error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[480px] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <Bot size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cashflow Copilot</p>
          <p className="text-xs text-zinc-500">Ask anything about your money</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles size={28} className="mb-3 text-emerald-500" />
            <p className="max-w-sm text-sm text-zinc-500">
              Hi! I&apos;m your cash flow copilot. I can see your recent transactions, forecast, and
              recurring bills. Try one of these:
            </p>
            <div className="mt-4 flex max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner className="h-4 w-4 text-emerald-500" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your cash flow..."
            className="max-h-32 min-h-8 w-full resize-none bg-transparent py-1 text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-emerald-500 p-2 text-white transition-colors hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  return (
    <div className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          msg.role === "assistant"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        )}
      >
        {msg.role === "assistant" ? <Bot size={15} /> : <User size={15} />}
      </div>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed",
          msg.role === "assistant"
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            : "bg-emerald-500 text-white"
        )}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
    </div>
  );
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
  html = html.replace(/(?:<br\/>\s*)?[-*] (.*?)(?:<br\/>|$)/g, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>)/g, "<ul class='my-1 list-disc pl-4 space-y-0.5'>$1</ul>");
  return html;
}