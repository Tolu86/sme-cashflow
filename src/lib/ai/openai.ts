import "server-only";
import OpenAI from "openai";

export const AI_MODEL = process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3-super-120b-a12b";

export function getOpenAI(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseURL = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  if (!apiKey) {
    throw new Error(
      "NVIDIA_API_KEY is not configured. Add it to .env.local.\n" +
        "Get a key at https://build.nvidia.com"
    );
  }
  return new OpenAI({ apiKey, baseURL });
}

export async function jsonCompletion<T>(
  client: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  instruction: string
): Promise<T> {
  const res = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      ...messages,
      {
        role: "user",
        content: `Return ONLY valid JSON. No prose, no markdown, no code fences.\n\n${instruction}`,
      },
    ],
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(stripCodeFence(content)) as T;
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    const firstNl = trimmed.indexOf("\n");
    const lastFence = trimmed.lastIndexOf("```");
    return firstNl >= 0 && lastFence > firstNl
      ? trimmed.slice(firstNl + 1, lastFence).trim()
      : trimmed;
  }
  return trimmed;
}