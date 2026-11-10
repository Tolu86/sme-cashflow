import { errorResponse, requireProPlan, verifyRequest } from "@/lib/ai/route-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type ReviewedItem = {
  description?: unknown;
  quantity?: unknown;
  amountMinor?: unknown;
  categoryId?: unknown;
};

type ImportBody = {
  businessId?: unknown;
  receiptId?: unknown;
  accountId?: unknown;
  merchant?: unknown;
  date?: unknown;
  receiptTotalMinor?: unknown;
  items?: unknown;
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ImportBody;

    if (typeof body.businessId !== "string" || !body.businessId.trim()) {
      return Response.json({ error: "Choose your business." }, { status: 400 });
    }

    await verifyRequest(req, body.businessId);
    await requireProPlan(body.businessId);

    if (
      typeof body.receiptId !== "string" || !/^[a-f0-9]{64}$/.test(body.receiptId) ||
      typeof body.accountId !== "string" || !body.accountId.trim() ||
      typeof body.date !== "string" || !validDate(body.date) ||
      !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 60
    ) {
      return Response.json({ error: "Invalid receipt, account, date, or item list." }, { status: 400 });
    }

    const db = getAdminDb();
    const prefix = "businesses/" + body.businessId;
    const [accountSnap, categorySnap] = await Promise.all([
      db.doc(prefix + "/accounts/" + body.accountId).get(),
      db.collection(prefix + "/categories").get(),
    ]);

    if (!accountSnap.exists) {
      return Response.json({ error: "This account no longer exists." }, { status: 422 });
    }

    const categoryIds = new Set(categorySnap.docs.filter((d) => d.data().type === "expense").map((d) => d.id));
    const entries = (body.items as ReviewedItem[]).map((entry) => {
      const description = typeof entry.description === "string" ? entry.description.trim().slice(0, 150) : "";
      const quantity = typeof entry.quantity === "string" ? entry.quantity.trim().slice(0, 40) : "";
      const amount = entry.amountMinor;
      const categoryId = typeof entry.categoryId === "string" ? entry.categoryId : "";
      return { description, quantity, amount, categoryId };
    });

    if (entries.some((entry) =>
      !entry.description || !Number.isSafeInteger(entry.amount) ||
      (entry.amount as number) <= 0 || (entry.amount as number) > 100_000_000_000 ||
      !categoryIds.has(entry.categoryId)
    )) {
      return Response.json({
        error: "Every selected item needs a description, positive amount, and a valid expense category.",
      }, { status: 422 });
    }

    const calculatedTotal = entries.reduce((sum, entry) => sum + (entry.amount as number), 0);
    const suppliedTotal = body.receiptTotalMinor;
    if (suppliedTotal !== null && suppliedTotal !== undefined) {
      if (typeof suppliedTotal !== "number" || !Number.isSafeInteger(suppliedTotal) || suppliedTotal < 0) {
        return Response.json({ error: "Invalid receipt total." }, { status: 422 });
      }
      if (Math.abs(calculatedTotal - suppliedTotal) > 1) {
        return Response.json({
          error: "The selected item amounts do not match the reviewed receipt total. Correct the amounts or total before importing.",
        }, { status: 422 });
      }
    }

    const now = Date.now();
    const merchant = typeof body.merchant === "string" ? body.merchant.trim().slice(0, 100) : "";
    const batchId = "receipt-" + body.receiptId.slice(0, 24);
    const batch = db.batch();
    const importRef = db.doc(prefix + "/receiptImports/" + body.receiptId);

    // The create precondition makes this atomic: no duplicate/partial transaction writes.
    batch.create(importRef, {
      receiptHash: body.receiptId,
      importedAt: now,
      accountId: body.accountId,
      date: body.date,
      merchant,
      totalMinor: calculatedTotal,
      itemCount: entries.length,
    });

    entries.forEach((entry) => {
      const transactionRef = db.collection(prefix + "/transactions").doc();
      const notes = [
        entry.description,
        entry.quantity ? "Quantity: " + entry.quantity : "",
        merchant ? "Merchant: " + merchant : "",
      ].filter(Boolean).join(" | ").slice(0, 250);

      batch.set(transactionRef, {
        businessId: body.businessId,
        accountId: body.accountId,
        type: "expense",
        amount: entry.amount,
        date: body.date,
        categoryId: entry.categoryId,
        vendorId: null,
        tags: ["receipt"],
        notes,
        status: "cleared",
        createdAt: now,
        updatedAt: now,
        importBatchId: batchId,
        autoCategorized: true,
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      const code = (err as { code?: string | number })?.code;
      if (code === 6 || code === "already-exists") {
        return Response.json({
          error: "This exact receipt image was already imported. No duplicate transactions were created.",
        }, { status: 409 });
      }
      throw err;
    }

    return Response.json({
      created: entries.length,
      totalMinor: calculatedTotal,
      batchId,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
