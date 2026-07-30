import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const result = await env.DB.prepare(
      `SELECT id, description, category, amount_cents AS amountCents,
              due_date AS dueDate, paid_at AS paidAt, created_at AS createdAt
       FROM expenses ORDER BY COALESCE(due_date, created_at) DESC LIMIT 200`,
    ).all();
    return Response.json({ expenses: result.results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "geral").trim() || "geral";
    const amountCents = Math.round(Number(body.amountCents));
    const dueDate = String(body.dueDate ?? "").trim() || null;
    const paidAt = body.paid ? new Date().toISOString() : null;
    if (!description || !Number.isFinite(amountCents) || amountCents <= 0) {
      return Response.json({ error: "Despesa inválida." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO expenses
        (id, description, category, amount_cents, due_date, paid_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, description, category, amountCents, dueDate, paidAt)
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; paid?: boolean };
    if (!body.id) {
      return Response.json({ error: "Despesa obrigatória." }, { status: 400 });
    }
    const paidAt = body.paid ? new Date().toISOString() : null;
    const result = await env.DB.prepare(
      "UPDATE expenses SET paid_at = ? WHERE id = ?",
    )
      .bind(paidAt, body.id)
      .run();
    if ((result.meta.changes ?? 0) !== 1) {
      return Response.json({ error: "Despesa não encontrada." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
