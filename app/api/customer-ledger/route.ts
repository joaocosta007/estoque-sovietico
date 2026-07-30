import { env } from "cloudflare:workers";

type LedgerRow = {
  id: string;
  customerId: string;
  customerName: string;
  type: "debit" | "payment";
  amountCents: number;
  description: string;
  saleId: string | null;
  dueDate: string | null;
  createdAt: string;
};

export async function GET(request: Request) {
  try {
    const customerId = new URL(request.url).searchParams.get("customerId");
    const where = customerId ? "WHERE l.customer_id = ?" : "";
    const statement = env.DB.prepare(
      `SELECT
         l.id, l.customer_id AS customerId, c.name AS customerName,
         l.type, l.amount_cents AS amountCents, l.description,
         l.sale_id AS saleId, l.due_date AS dueDate,
         l.created_at AS createdAt
       FROM customer_ledger l
       JOIN customers c ON c.id = l.customer_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 200`,
    );
    const result = customerId
      ? await statement.bind(customerId).all<LedgerRow>()
      : await statement.all<LedgerRow>();
    return Response.json({ entries: result.results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = String(body.customerId ?? "").trim();
    const type = String(body.type ?? "");
    const amountCents = Math.round(Number(body.amountCents));
    const description =
      String(body.description ?? "").trim() ||
      (type === "payment" ? "Pagamento recebido" : "Compra a prazo");
    const dueDate = String(body.dueDate ?? "").trim() || null;

    if (
      !customerId ||
      !["debit", "payment"].includes(type) ||
      !Number.isFinite(amountCents) ||
      amountCents <= 0
    ) {
      return Response.json({ error: "Lançamento inválido." }, { status: 400 });
    }

    const guardId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const balanceSql = `COALESCE((
      SELECT SUM(CASE WHEN type = 'debit' THEN amount_cents ELSE -amount_cents END)
      FROM customer_ledger WHERE customer_id = ?
    ), 0)`;
    const guardCondition =
      type === "debit"
        ? `${balanceSql} + ? <= credit_limit_cents`
        : `${balanceSql} >= ?`;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO credit_guards (id, ok)
         SELECT ?, CASE WHEN active = 1 AND ${guardCondition} THEN 1 ELSE 0 END
         FROM customers WHERE id = ?`,
      ).bind(guardId, customerId, amountCents, customerId),
      env.DB.prepare(
        `INSERT INTO customer_ledger
          (id, customer_id, type, amount_cents, description, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(entryId, customerId, type, amountCents, description, dueDate),
      env.DB.prepare("DELETE FROM credit_guards WHERE id = ?").bind(guardId),
    ]);

    return Response.json({ id: entryId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    if (
      message.includes("credit_guards_ok") ||
      message.includes("CHECK constraint failed")
    ) {
      return Response.json(
        { error: "Operação excede o limite ou o saldo devedor disponível." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
