import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";
import { applyLateFees } from "../../../lib/credit";

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
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    await applyLateFees();
    const customerId = new URL(request.url).searchParams.get("customerId");
    const sql = getSql();
    const baseColumns = sql`
      SELECT
        l.id, l.customer_id AS "customerId", c.name AS "customerName",
        l.type, l.amount_cents AS "amountCents", l.description,
        l.sale_id AS "saleId", l.due_date AS "dueDate",
        l.created_at AS "createdAt"
      FROM customer_ledger l
      JOIN customers c ON c.id = l.customer_id
    `;
    const entries = customerId
      ? await sql<LedgerRow[]>`
          ${baseColumns}
          WHERE l.customer_id = ${customerId}
          ORDER BY l.created_at DESC
          LIMIT 200
        `
      : await sql<LedgerRow[]>`
          ${baseColumns}
          ORDER BY l.created_at DESC
          LIMIT 200
        `;
    return Response.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    await applyLateFees();
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

    const entryId = crypto.randomUUID();
    const sql = getSql();
    await sql.begin(async (tx) => {
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
      const currentBalance = balance?.balanceCents ?? 0;
      if (
        type === "debit" &&
        currentBalance + amountCents > customers[0].creditLimitCents
      ) {
        throw new Error("CREDIT_LIMIT");
      }
      if (type === "payment" && amountCents > currentBalance) {
        throw new Error("PAYMENT_OVER_BALANCE");
      }

      await tx`
        INSERT INTO customer_ledger
          (id, customer_id, type, amount_cents, description, due_date)
        VALUES (
          ${entryId}, ${customerId}, ${type}, ${amountCents},
          ${description}, ${dueDate}
        )
      `;
    });
    return Response.json({ id: entryId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    if (message === "CUSTOMER_NOT_FOUND") {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    if (message === "CREDIT_LIMIT" || message === "PAYMENT_OVER_BALANCE") {
      return Response.json(
        { error: "Operação excede o limite ou o saldo devedor disponível." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
