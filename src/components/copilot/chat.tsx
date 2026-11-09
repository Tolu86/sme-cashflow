
"use client";

import { useEffect, useRef, useState } from "react";
import {
  SendHorizonal,
  Bot,
  User,
  Sparkles,
  Lock,
} from "lucide-react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/button";
import { isTrialActive } from "@/lib/plans";

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

  const isPro =
    business?.plan === "pro" ||
    business?.plan === "premium" ||
    (business ? isTrialActive(business.trialEndsAt) : false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();

    if (
      !trimmed ||
      !business?.id ||
      loading ||
      !isPro
    ) {
      return;
    }

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed,
      },
    ]);

    setLoading(true);

    try {
      const token = await getIdToken(
        auth!.currentUser!,
        true
      );

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: business.id,
          message: trimmed,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "Request failed"
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${
            err instanceof Error
              ? err.message
              : "unknown error"
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!business) {
    return null;
  }

  if (!isPro) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 text-center shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Lock
            size={22}
            className="text-emerald-600"
          />
        </div>

        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Cashflow Copilot is a Pro feature
        </h3>

        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Upgrade to Pro to chat with your AI
          financial assistant and get personalized
          answers based on your business data.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/settings";
          }}
          className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          Upgrade to Pro
        </button>

        <p className="mt-2 text-xs text-zinc-400">
          Pro is ₦3,000/month.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[560px] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:h-[640px]">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#f5faf7] px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c076] text-[#073c29]">
          <Bot size={18} />
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Cashflow Copilot
          </p>

          <p className="text-xs text-zinc-500">
            Ask anything about your money
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-white px-4 py-5 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles
              size={28}
              className="mb-3 text-emerald-500"
            />

            <p className="max-w-sm text-sm text-zinc-500">
              Hi! I&apos;m your cash flow copilot. I
              can see your recent transactions,
              forecast, and recurring bills. Try one
              of these:
            </p>

            <div className="mt-5 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-left text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            msg={m}
          />
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
        className="border-t border-slate-100 bg-[#fbfdfc] p-4 sm:p-5"
      >
        <div
          data-tour="copilot-input"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100"
        >
          <textarea
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your cash flow..."
            className="max-h-32 min-h-8 w-full resize-none bg-transparent py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />

          <button
            type="submit"
            disabled={
              loading || !input.trim()
            }
            className="shrink-0 rounded-xl bg-[#00c076] p-2.5 text-[#073c29] transition hover:bg-emerald-300 disabled:pointer-events-none disabled:opacity-40"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  msg,
}: {
  msg: Msg;
}) {
  return (
    <div
      className={cn(
        "flex gap-3",
        msg.role === "user" &&
          "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          msg.role === "assistant"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        )}
      >
        {msg.role === "assistant" ? (
          <Bot size={15} />
        ) : (
          <User size={15} />
        )}
      </div>

      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed",
          msg.role === "assistant"
            ? "rounded-bl-md bg-slate-100 text-slate-900"
            : "rounded-br-md bg-[#007a52] text-white"
        )}
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(
            msg.content
          ),
        }}
      />
    </div>
  );
}

function renderMarkdown(
  text: string
): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /\*(.*?)\*/g,
      "<em>$1</em>"
    )
    .replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    )
    .replace(
      /\n/g,
      "<br/>"
    );

  html = html.replace(
    /(?:<br\/>\s*)?[-*] (.*?)(?:<br\/>|$)/g,
    "<li>$1</li>"
  );

  html = html.replace(
    /(<li>.*?<\/li>)/g,
    "<ul class='my-1 list-disc pl-4 space-y-0.5'>$1</ul>"
  );

  return html;
}
