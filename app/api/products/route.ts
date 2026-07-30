import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada";
  if (message.includes("UNIQUE constraint failed")) {
    return Response.json(
      { error: "SKU ou código de barras já cadastrado." },
      { status: 409 },
    );
  }
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.name));
    return Response.json({ products: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const barcode = String(body.barcode ?? "").trim() || null;
    const salePriceCents = numberOrNull(body.salePriceCents);
    const initialStockMilli = numberOrNull(body.initialStockMilli) ?? 0;
    const minStockMilli = numberOrNull(body.minStockMilli) ?? 0;

    if (!name || !sku || salePriceCents === null || salePriceCents < 0) {
      return Response.json(
        { error: "Nome, SKU e preço válido são obrigatórios." },
        { status: 400 },
      );
    }
    if (initialStockMilli < 0 || minStockMilli < 0) {
      return Response.json(
        { error: "Quantidades não podem ser negativas." },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const statements = [
      env.DB.prepare(
        `INSERT INTO products
          (id, name, sku, barcode, sale_price_cents, stock_milli, min_stock_milli)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        name,
        sku,
        barcode,
        Math.round(salePriceCents),
        Math.round(initialStockMilli),
        Math.round(minStockMilli),
      ),
    ];
    if (initialStockMilli > 0) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO stock_movements
            (id, product_id, type, quantity_milli, note)
           VALUES (?, ?, 'opening', ?, 'Saldo inicial')`,
        ).bind(crypto.randomUUID(), id, Math.round(initialStockMilli)),
      );
    }
    await env.DB.batch(statements);

    const db = getDb();
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    const name = String(body.name ?? "").trim();
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const barcode = String(body.barcode ?? "").trim() || null;
    const salePriceCents = numberOrNull(body.salePriceCents);
    const minStockMilli = numberOrNull(body.minStockMilli);

    if (
      !id ||
      !name ||
      !sku ||
      salePriceCents === null ||
      salePriceCents < 0 ||
      minStockMilli === null ||
      minStockMilli < 0
    ) {
      return Response.json({ error: "Dados de produto inválidos." }, { status: 400 });
    }

    const db = getDb();
    const [product] = await db
      .update(products)
      .set({
        name,
        sku,
        barcode,
        salePriceCents: Math.round(salePriceCents),
        minStockMilli: Math.round(minStockMilli),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!product) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return Response.json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return Response.json({ error: "ID obrigatório." }, { status: 400 });
    }
    const db = getDb();
    const [product] = await db
      .update(products)
      .set({ active: false, updatedAt: new Date().toISOString() })
      .where(eq(products.id, body.id))
      .returning();
    if (!product) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
