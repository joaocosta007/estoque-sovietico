import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const result = await env.DB.prepare(
      `SELECT id, name, role, permissions, active, created_at AS createdAt
       FROM staff_members WHERE active = 1 ORDER BY name`,
    ).all<{
      id: string;
      name: string;
      role: string;
      permissions: string;
      active: number;
      createdAt: string;
    }>();
    return Response.json({
      staff: result.results.map((member) => ({
        ...member,
        active: member.active === 1,
        permissions: JSON.parse(member.permissions) as string[],
      })),
    });
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
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "").trim();
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : [];
    if (!name || !role) {
      return Response.json({ error: "Nome e função são obrigatórios." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO staff_members (id, name, role, permissions)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(id, name, role, JSON.stringify(permissions))
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
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : [];
    if (!id) {
      return Response.json({ error: "Funcionário obrigatório." }, { status: 400 });
    }
    const result = await env.DB.prepare(
      `UPDATE staff_members
       SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
      .bind(JSON.stringify(permissions), id)
      .run();
    if ((result.meta.changes ?? 0) !== 1) {
      return Response.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
