import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";

function targetUrl(value: unknown) {
  const url = String(value ?? "/catalogo").trim() || "/catalogo";
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("O destino deve ser uma rota interna, como /catalogo.");
  }
  return url.slice(0, 200);
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim().slice(0, 80);
    const title = String(body.title ?? "").trim().slice(0, 80);
    const message = String(body.body ?? "").trim().slice(0, 240);
    if (!name || !title || !message) {
      return Response.json(
        { error: "Informe nome, título e mensagem do template." },
        { status: 400 },
      );
    }
    await getSql()`
      INSERT INTO notification_templates
        (id, name, title, body, target_url)
      VALUES (
        ${crypto.randomUUID()}, ${name}, ${title}, ${message},
        ${targetUrl(body.targetUrl)}
      )
    `;
    return Response.json({ created: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    return Response.json(
      { error: message.includes("unique") ? "Já existe um template com esse nome." : message },
      { status: message.includes("unique") ? 409 : 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const id = String(((await request.json()) as { id?: string }).id ?? "").trim();
    if (!id) return Response.json({ error: "Template ausente." }, { status: 400 });
    await getSql()`DELETE FROM notification_templates WHERE id = ${id}`;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
