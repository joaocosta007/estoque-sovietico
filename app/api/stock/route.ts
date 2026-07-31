import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as {
      productId?: string;
      quantityMilli?: number;
      note?: string;
    };
    const productId = body.productId?.trim() ?? "";
    const quantityMilli = Math.round(Number(body.quantityMilli));
    const note = body.note?.trim() ?? "Entrada manual";

    if (!productId || !Number.isFinite(quantityMilli) || quantityMilli <= 0) {
      return Response.json(
        { error: "Produto e quantidade positiva são obrigatórios." },
        { status: 400 },
      );
    }

    const sql = getSql();
    await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`
        SELECT id FROM products
        WHERE id = ${productId} AND active = true
        FOR UPDATE
      `;
      if (!rows[0]) throw new Error("PRODUCT_NOT_FOUND");

      await tx`
        UPDATE products
        SET stock_milli = stock_milli + ${quantityMilli},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${productId}
      `;
      await tx`
        INSERT INTO stock_movements
          (id, product_id, type, quantity_milli, note)
        VALUES (
          ${crypto.randomUUID()}, ${productId}, 'entry',
          ${quantityMilli}, ${note}
        )
      `;
    });
    return Response.json({ registered: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    if (message === "PRODUCT_NOT_FOUND") {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
