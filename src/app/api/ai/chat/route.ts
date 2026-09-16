import { getOpenAI, AI_MODEL } from "@/lib/ai/openai";
import { chatSystemPrompt } from "@/lib/ai/prompts";
import { verifyRequest, errorResponse } from "@/lib/ai/route-auth";
import { buildAiContext } from "@/lib/ai/context";
import type OpenAI from "openai";

export const maxDuration = 60;

interface ChatRequest {
  businessId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest;
    if (!body.businessId || !body.message?.trim()) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    await verifyRequest(req, body.businessId);

    const ctx = await buildAiContext(body.businessId);
    const client = getOpenAI();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: chatSystemPrompt(ctx) },
    ];
    for (const h of (body.history ?? []).slice(-10)) {
      messages.push({ role: h.role === "user" ? "user" : "assistant", content: h.content });
    }
    messages.push({ role: "user", content: body.message });

    const res = await client.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.4,
    });

    const answer = res.choices[0]?.message?.content ?? "I couldn't process that. Please try again.";
    return Response.json({ answer });
  } catch (err) {
    return errorResponse(err);
  }
}