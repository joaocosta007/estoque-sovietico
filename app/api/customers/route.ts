import { env } from "cloudflare:workers";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  document: string;
  creditLimitCents: number;
  notes: string;
  active: number;
  createdAt: string;
  updatedAt: string;
  balanceCents: number;
};

function mapCustomer(row: CustomerRow) {
  return { ...row, active: row.active === 1 };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const result = await env.DB.prepare(
      `SELECT
         c.id, c.name, c.phone, c.document,
         c.credit_limit_cents AS creditLimitCents,
         c.notes, c.active, c.created_at AS createdAt,
         c.updated_at AS updatedAt,
         COALESCE(SUM(
           CASE
             WHEN l.type = 'debit' THEN l.amount_cents
             WHEN l.type = 'payment' THEN -l.amount_cents
             ELSE 0
           END
         ), 0) AS balanceCents
       FROM customers c
       LEFT JOIN customer_ledger l ON l.customer_id = c.id
       WHERE c.active = 1
       GROUP BY c.id
       ORDER BY c.name ASC`,
    ).all<CustomerRow>();

    return Response.json({ customers: result.results.map(mapCustomer) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
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
    await env.DB.prepare(
      `INSERT INTO customers
        (id, name, phone, document, credit_limit_cents, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, name, phone, document, creditLimitCents, notes)
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
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

    const result = await env.DB.prepare(
      `UPDATE customers
       SET name = ?, phone = ?, document = ?, credit_limit_cents = ?,
           notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND active = 1`,
    )
      .bind(name, phone, document, creditLimitCents, notes, id)
      .run();
    if ((result.meta.changes ?? 0) !== 1) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
