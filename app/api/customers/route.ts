import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";
import { applyLateFees } from "../../../lib/credit";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  document: string;
  creditLimitCents: number;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  balanceCents: number;
};

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    await applyLateFees();
    const sql = getSql();
    const customers = await sql<CustomerRow[]>`
      SELECT
        c.id, c.name, c.phone, c.document,
        c.credit_limit_cents AS "creditLimitCents",
        c.notes, c.active, c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        COALESCE(SUM(
          CASE
            WHEN l.type = 'debit' THEN l.amount_cents
            WHEN l.type = 'payment' THEN -l.amount_cents
            ELSE 0
          END
        ), 0)::int AS "balanceCents"
      FROM customers c
      LEFT JOIN customer_ledger l ON l.customer_id = c.id
      WHERE c.active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return Response.json({ customers });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const document = String(body.document ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const creditLimitCents = Math.round(Number(body.creditLimitCents ?? 0));
    if (!name || !Number.isFinite(creditLimitCents) || creditLimitCents < 0) {
      return Response.json(
        { error: "Nome e limite de crédito válido são obrigatórios." },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const sql = getSql();
    await sql`
      INSERT INTO customers
        (id, name, phone, document, credit_limit_cents, notes)
      VALUES (
        ${id}, ${name}, ${phone}, ${document}, ${creditLimitCents}, ${notes}
      )
    `;
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const document = String(body.document ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const creditLimitCents = Math.round(Number(body.creditLimitCents ?? 0));
    if (!id || !name || !Number.isFinite(creditLimitCents) || creditLimitCents < 0) {
      return Response.json({ error: "Dados de cliente inválidos." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql<{ id: string }[]>`
      UPDATE customers
      SET name = ${name}, phone = ${phone}, document = ${document},
          credit_limit_cents = ${creditLimitCents}, notes = ${notes},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND active = true
      RETURNING id
    `;
    if (!rows[0]) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
