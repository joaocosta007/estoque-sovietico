import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { sales } from "../../../db/schema";

type SaleItemInput = {
  productId?: string;
  quantityMilli?: number;
};

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(500);
    const today = new Date().toISOString().slice(0, 10);
    const todayTotalCents = rows
      .filter((sale) => sale.createdAt.startsWith(today))
      .reduce((total, sale) => total + sale.totalCents, 0);
    return Response.json({ sales: rows, todayTotalCents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: SaleItemInput[];
      paymentMethod?: string;
      discountCents?: number;
      customerId?: string;
    };
    const items = (body.items ?? [])
      .map((item) => ({
        productId: item.productId?.trim() ?? "",
        quantityMilli: Math.round(Number(item.quantityMilli)),
      }))
      .filter(
        (item) =>
          item.productId &&
          Number.isFinite(item.quantityMilli) &&
          item.quantityMilli > 0,
      );

    if (items.length === 0) {
      return Response.json({ error: "Inclua ao menos um item." }, { status: 400 });
    }

    const uniqueIds = [...new Set(items.map((item) => item.productId))];
    const placeholders = uniqueIds.map(() => "?").join(",");
    const productResult = await env.DB.prepare(
      `SELECT id, name, sale_price_cents
       FROM products
       WHERE active = 1 AND id IN (${placeholders})`,
    )
      .bind(...uniqueIds)
      .all<{ id: string; name: string; sale_price_cents: number }>();

    if (productResult.results.length !== uniqueIds.length) {
      return Response.json(
        { error: "Um dos produtos não existe ou está inativo." },
        { status: 409 },
      );
    }

    const productMap = new Map(productResult.results.map((product) => [product.id, product]));
    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotalCents = Math.round(
        (product.sale_price_cents * item.quantityMilli) / 1000,
      );
      return { ...item, product, lineTotalCents };
    });
    const subtotalCents = normalizedItems.reduce(
      (total, item) => total + item.lineTotalCents,
      0,
    );
    const discountCents = Math.max(0, Math.round(Number(body.discountCents ?? 0)));
    const totalCents = subtotalCents - discountCents;
    if (totalCents < 0) {
      return Response.json(
        { error: "Desconto não pode superar o subtotal." },
        { status: 400 },
      );
    }

    const paymentMethod = body.paymentMethod?.trim() || "pix";
    const customerId = body.customerId?.trim() || null;
    if (paymentMethod === "credit" && !customerId) {
      return Response.json(
        { error: "Selecione o cliente para registrar uma venda fiada." },
        { status: 400 },
      );
    }

    const saleId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];
    let creditGuardId = "";

    if (paymentMethod === "credit") {
      creditGuardId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `INSERT INTO credit_guards (id, ok)
           SELECT ?, CASE WHEN active = 1 AND
             COALESCE((
               SELECT SUM(
                 CASE WHEN type = 'debit' THEN amount_cents ELSE -amount_cents END
               )
               FROM customer_ledger WHERE customer_id = ?
             ), 0) + ? <= credit_limit_cents
           THEN 1 ELSE 0 END
           FROM customers WHERE id = ?`,
        ).bind(creditGuardId, customerId, totalCents, customerId),
      );
    }

    statements.push(
      env.DB.prepare(
        `INSERT INTO sales
          (id, customer_id, subtotal_cents, discount_cents, total_cents,
           payment_method, status)
         VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
      ).bind(
        saleId,
        customerId,
        subtotalCents,
        discountCents,
        totalCents,
        paymentMethod,
      ),
    );

    for (const item of normalizedItems) {
      const guardId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `INSERT INTO sale_guards (id, ok)
           SELECT ?, CASE
             WHEN active = 1 AND stock_milli >= ? THEN 1
             ELSE 0
           END
           FROM products
           WHERE id = ?`,
        ).bind(guardId, item.quantityMilli, item.productId),
        env.DB.prepare(
          `UPDATE products
           SET stock_milli = stock_milli - ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        ).bind(item.quantityMilli, item.productId),
        env.DB.prepare(
          `INSERT INTO sale_items
            (id, sale_id, product_id, product_name, quantity_milli,
             unit_price_cents, line_total_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          saleId,
          item.productId,
          item.product.name,
          item.quantityMilli,
          item.product.sale_price_cents,
          item.lineTotalCents,
        ),
        env.DB.prepare(
          `INSERT INTO stock_movements
            (id, product_id, type, quantity_milli, reference_id, note)
           VALUES (?, ?, 'sale', ?, ?, 'Baixa por venda')`,
        ).bind(
          crypto.randomUUID(),
          item.productId,
          -item.quantityMilli,
          saleId,
        ),
        env.DB.prepare("DELETE FROM sale_guards WHERE id = ?").bind(guardId),
      );
    }

    if (paymentMethod === "credit" && customerId) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO customer_ledger
            (id, customer_id, type, amount_cents, description, sale_id)
           VALUES (?, ?, 'debit', ?, 'Venda fiada', ?)`,
        ).bind(crypto.randomUUID(), customerId, totalCents, saleId),
        env.DB.prepare("DELETE FROM credit_guards WHERE id = ?").bind(
          creditGuardId,
        ),
      );
    }

    await env.DB.batch(statements);
    return Response.json(
      { sale: { id: saleId, subtotalCents, discountCents, totalCents } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    if (
      message.includes("sale_guards_ok") ||
      message.includes("credit_guards_ok") ||
      message.includes("CHECK constraint failed")
    ) {
      return Response.json(
        { error: "Estoque insuficiente ou limite de crédito excedido." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
