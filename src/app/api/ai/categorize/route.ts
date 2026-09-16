import { getOpenAI, jsonCompletion } from "@/lib/ai/openai";
import { CATEGORIZE_INSTRUCTION } from "@/lib/ai/prompts";
import { verifyRequest, errorResponse } from "@/lib/ai/route-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const maxDuration = 60;

interface CatRequest {
  businessId: string;
  drafts: { description: string; amount: number; type: "income" | "expense" }[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CatRequest;
    if (!body.businessId || !Array.isArray(body.drafts)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    await verifyRequest(req, body.businessId);

    const db = getAdminDb();
    const categoriesSnap = await db.collection(`businesses/${body.businessId}/categories`).get();
    const categories = categoriesSnap.docs.map((d) => ({ id: d.id, name: d.data().name, type: d.data().type }));
    const vendorsSnap = await db.collection(`businesses/${body.businessId}/vendors`).get();
    const vendors = vendorsSnap.docs.map((d) => ({ id: d.id, name: d.data().name }));

    const chunks = chunk(body.drafts, 40);
    const results: { index: number; categoryId: string | null; categoryName: string; vendorId: string | null; vendorName: string }[] = [];

    for (const chunkDrafts of chunks) {
      const offset = body.drafts.indexOf(chunkDrafts[0]);
      const input = chunkDrafts.map((d, i) => ({
        index: offset + i,
        description: d.description,
        amount: d.amount / 100,
        type: d.type,
      }));

      const reply = await jsonCompletion<{ results: typeof results }>(
        getOpenAI(),
        [
          {
            role: "system",
            content: `You categorize bank transactions. Available categories (id|name|type): ${categories
              .map((c) => `${c.id}|${c.name}|${c.type}`)
              .join("; ")}. Available vendors (id|name): ${vendors.map((v) => `${v.id}|${v.name}`).join("; ")}`,
          },
          { role: "user", content: `Categorize these transactions:\n${JSON.stringify(input)}` },
        ],
        CATEGORIZE_INSTRUCTION
      );
      results.push(...(reply.results ?? []));
    }

    return Response.json({ results });
  } catch (err) {
    return errorResponse(err);
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}