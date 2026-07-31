import { desc } from "drizzle-orm";
import { getDb, getSql } from "../../../db";
import { sales } from "../../../db/schema";
import { requireAdminApi } from "../../../lib/auth";

type SaleItemInput = {
  productId?: string;
  quantityMilli?: number;
};

type ProductRow = {
  id: string;
  name: string;
  salePriceCents: number;
  stockMilli: number;
};

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const rows = await getDb()
      .select()
      .from(sales)
      .orderBy(desc(sales.createdAt))
      .limit(500);
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
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
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

    const discountCents = Math.max(0, Math.round(Number(body.discountCents ?? 0)));
    const paymentMethod = body.paymentMethod?.trim() || "pix";
    const customerId = body.customerId?.trim() || null;
    if (paymentMethod === "credit" && !customerId) {
      return Response.json(
        { error: "Selecione o cliente para registrar uma venda fiada." },
        { status: 400 },
      );
    }

    const saleId = crypto.randomUUID();
    const sql = getSql();
    const sale = await sql.begin(async (tx) => {
      const uniqueIds = [...new Set(items.map((item) => item.productId))];
      const productRows = await tx<ProductRow[]>`
        SELECT
          id, name, sale_price_cents AS "salePriceCents",
          stock_milli AS "stockMilli"
        FROM products
        WHERE active = true AND id IN ${tx(uniqueIds)}
        FOR UPDATE
      `;
      if (productRows.length !== uniqueIds.length) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const productMap = new Map(productRows.map((product) => [product.id, product]));
      const normalizedItems = items.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          ...item,
          product,
          lineTotalCents: Math.round(
            (product.salePriceCents * item.quantityMilli) / 1000,
          ),
        };
      });

      const requestedByProduct = new Map<string, number>();
      for (const item of normalizedItems) {
        requestedByProduct.set(
          item.productId,
          (requestedByProduct.get(item.productId) ?? 0) + item.quantityMilli,
        );
      }
      for (const [productId, quantity] of requestedByProduct) {
        if ((productMap.get(productId)?.stockMilli ?? 0) < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      const subtotalCents = normalizedItems.reduce(
        (total, item) => total + item.lineTotalCents,
        0,
      );
      const totalCents = subtotalCents - discountCents;
      if (totalCents < 0) throw new Error("INVALID_DISCOUNT");

      if (paymentMethod === "credit" && customerId) {
        const customers = await tx<{ creditLimitCents: number }[]>`
          SELECT credit_limit_cents AS "creditLimitCents"
          FROM customers
          WHERE id = ${customerId} AND active = true
          FOR UPDATE
        `;
        if (!customers[0]) throw new Error("CUSTOMER_NOT_FOUND");
        const [balance] = await tx<{ balanceCents: number }[]>`
          SELECT COALESCE(SUM(
            CASE WHEN type = 'debit' THEN amount_cents ELSE -amount_cents END
          ), 0)::int AS "balanceCents"
          FROM customer_ledger
          WHERE customer_id = ${customerId}
        `;
        if (
          (balance?.balanceCents ?? 0) + totalCents >
          customers[0].creditLimitCents
        ) {
          throw new Error("CREDIT_LIMIT");
        }
      }

      await tx`
        INSERT INTO sales
          (id, customer_id, subtotal_cents, discount_cents, total_cents,
           payment_method, status)
        VALUES (
          ${saleId}, ${customerId}, ${subtotalCents}, ${discountCents},
          ${totalCents}, ${paymentMethod}, 'completed'
        )
      `;

      for (const item of normalizedItems) {
        await tx`
          UPDATE products
          SET stock_milli = stock_milli - ${item.quantityMilli},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${item.productId}
        `;
        await tx`
          INSERT INTO sale_items
            (id, sale_id, product_id, product_name, quantity_milli,
             unit_price_cents, line_total_cents)
          VALUES (
            ${crypto.randomUUID()}, ${saleId}, ${item.productId},
            ${item.product.name}, ${item.quantityMilli},
            ${item.product.salePriceCents}, ${item.lineTotalCents}
          )
        `;
        await tx`
          INSERT INTO stock_movements
            (id, product_id, type, quantity_milli, reference_id, note)
          VALUES (
            ${crypto.randomUUID()}, ${item.productId}, 'sale',
            ${-item.quantityMilli}, ${saleId}, 'Baixa por venda'
          )
        `;
      }

      if (paymentMethod === "credit" && customerId) {
        await tx`
          INSERT INTO customer_ledger
            (id, customer_id, type, amount_cents, description, sale_id)
          VALUES (
            ${crypto.randomUUID()}, ${customerId}, 'debit',
            ${totalCents}, 'Venda fiada', ${saleId}
          )
        `;
      }

      return { id: saleId, subtotalCents, discountCents, totalCents };
    });

    return Response.json({ sale }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    const knownErrors: Record<string, [string, number]> = {
      PRODUCT_NOT_FOUND: ["Um dos produtos não existe ou está inativo.", 409],
      INSUFFICIENT_STOCK: ["Estoque insuficiente.", 409],
      INVALID_DISCOUNT: ["Desconto não pode superar o subtotal.", 400],
      CUSTOMER_NOT_FOUND: ["Cliente não encontrado.", 409],
      CREDIT_LIMIT: ["Limite de crédito excedido.", 409],
    };
    const known = knownErrors[message];
    if (known) return Response.json({ error: known[0] }, { status: known[1] });
    return Response.json({ error: message }, { status: 500 });
  }
}
