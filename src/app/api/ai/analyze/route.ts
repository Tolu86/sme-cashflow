import { getOpenAI, AI_MODEL } from "@/lib/ai/openai";
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
      messages: [
        {
          role: "system",
          content: `You are an SME finance analyst. Based on this snapshot, list the top money findings (currency ${ctx.currency}):
- Balance: ${ctx.currentBalance}
- Net 30d: ${ctx.net30d}
- Categories: ${ctx.categoryTotals.map((c) => `${c.name}=${c.total} (${c.count})`).join(", ")}
- Monthly: ${ctx.monthly.map((m) => `${m.month} in=${m.income} out=${m.expense}`).join(", ")}
- Recurring: ${ctx.recurring.map((r) => `${r.label} ${r.amount} next ${r.nextDue}`).join(", ")}
- Anomalies: ${ctx.anomalies.join("; ") || "none"}

Respond with ONLY valid JSON: {"findings":[{"title":"short title","detail":"1-2 sentence insight","tone":"good|bad|neutral"}]}. Max 5 findings, plain language. No prose or markdown.`,
        },
      ],
      temperature: 0.3,
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return Response.json({ findings: parsed.findings ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}