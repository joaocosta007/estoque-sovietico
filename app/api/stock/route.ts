import { env } from "cloudflare:workers";

export async function POST(request: Request) {
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

    const movementId = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE products
         SET stock_milli = stock_milli + ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND active = 1`,
      ).bind(quantityMilli, productId),
      env.DB.prepare(
        `INSERT INTO stock_movements
          (id, product_id, type, quantity_milli, note)
         SELECT ?, id, 'entry', ?, ?
         FROM products
         WHERE id = ? AND active = 1`,
      ).bind(movementId, quantityMilli, note, productId),
    ]);

    if ((results[0].meta.changes ?? 0) !== 1) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return Response.json({ registered: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    return Response.json({ error: message }, { status: 500 });
  }
}
