import { asc, eq } from "drizzle-orm";
import { getDb, getSql } from "../../../db";
import { products } from "../../../db/schema";
import { requireAdminApi } from "../../../lib/auth";

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada";
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return Response.json(
      { error: "SKU ou código de barras já cadastrado." },
      { status: 409 },
    );
  }
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const rows = await getDb()
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
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const barcode = String(body.barcode ?? "").trim() || null;
    const photoUrl = String(body.photoUrl ?? "").trim() || null;
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
    const sql = getSql();
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO products
          (id, name, sku, barcode, photo_url, sale_price_cents,
           stock_milli, min_stock_milli)
        VALUES (
          ${id}, ${name}, ${sku}, ${barcode}, ${photoUrl},
          ${Math.round(salePriceCents)}, ${Math.round(initialStockMilli)},
          ${Math.round(minStockMilli)}
        )
      `;
      if (initialStockMilli > 0) {
        await tx`
          INSERT INTO stock_movements
            (id, product_id, type, quantity_milli, note)
          VALUES (
            ${crypto.randomUUID()}, ${id}, 'opening',
            ${Math.round(initialStockMilli)}, 'Saldo inicial'
          )
        `;
      }
    });

    const [product] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, id));
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    const name = String(body.name ?? "").trim();
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const barcode = String(body.barcode ?? "").trim() || null;
    const photoUrl = String(body.photoUrl ?? "").trim() || null;
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

    const [product] = await getDb()
      .update(products)
      .set({
        name,
        sku,
        barcode,
        photoUrl,
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
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return Response.json({ error: "ID obrigatório." }, { status: 400 });
    }
    const [product] = await getDb()
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
