import { getOpenAI, AI_MODEL } from "@/lib/ai/openai";
import { forecastNarrativePrompt } from "@/lib/ai/prompts";
import { verifyRequest, errorResponse } from "@/lib/ai/route-auth";
import { buildAiContext } from "@/lib/ai/context";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { businessId: string };
    if (!body.businessId) return Response.json({ error: "Invalid request" }, { status: 400 });
    await verifyRequest(req, body.businessId);

    const ctx = await buildAiContext(body.businessId);
    const client = getOpenAI();
    const res = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "system", content: forecastNarrativePrompt(ctx) }],
      temperature: 0.4,
    });
    const narrative = res.choices[0]?.message?.content ?? "";

    return Response.json({
      narrative,
      forecast: ctx.forecast30d,
      currentBalance: ctx.currentBalance,
      net30d: ctx.net30d,
      currency: ctx.currency,
    });
  } catch (err) {
    return errorResponse(err);
  }
}