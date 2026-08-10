import { getSql } from "../../../db";
import { getAdminSession, requireAdminApi } from "../../../lib/auth";
import { sendNotificationCampaign } from "../../../lib/push";

function normalizeTarget(value: unknown) {
  const url = String(value ?? "/catalogo").trim() || "/catalogo";
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("O destino deve ser uma rota interna, como /catalogo.");
  }
  return url.slice(0, 200);
}

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const sql = getSql();
    const [campaigns, templates, subscriptions] = await Promise.all([
      sql`
        SELECT
          c.id, c.title, c.body, c.target_url AS "targetUrl",
          c.audience, c.status, c.scheduled_at AS "scheduledAt",
          c.sent_at AS "sentAt", c.created_at AS "createdAt",
          COALESCE(SUM(CASE WHEN d.status = 'sent' THEN 1 ELSE 0 END), 0)::int AS "sentCount",
          COALESCE(SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END), 0)::int AS "failedCount"
        FROM notification_campaigns c
        LEFT JOIN notification_deliveries d ON d.campaign_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT id, name, title, body, target_url AS "targetUrl",
               created_at AS "createdAt"
        FROM notification_templates
        ORDER BY name
      `,
      sql`
        SELECT id, label, active, created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM push_subscriptions
        WHERE active = true
        ORDER BY label, created_at
      `,
    ]);
    return Response.json({ campaigns, templates, subscriptions });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title ?? "").trim().slice(0, 80);
    const message = String(body.body ?? "").trim().slice(0, 240);
    if (!title || !message) {
      return Response.json(
        { error: "Informe o título e a mensagem da notificação." },
        { status: 400 },
      );
    }
    const audienceValue = String(body.audience ?? "all").trim();
    if (audienceValue !== "all" && !audienceValue.startsWith("subscription:")) {
      return Response.json({ error: "Destinatário inválido." }, { status: 400 });
    }
    const sendNow = body.sendNow === true;
    const scheduledDate = sendNow ? null : new Date(String(body.scheduledAt ?? ""));
    if (!sendNow && (!Number.isFinite(scheduledDate?.getTime()) || scheduledDate! <= new Date())) {
      return Response.json(
        { error: "Escolha uma data futura para o agendamento." },
        { status: 400 },
      );
    }

    const session = await getAdminSession();
    const id = crypto.randomUUID();
    await getSql()`
      INSERT INTO notification_campaigns
        (id, template_id, title, body, target_url, audience, status,
         scheduled_at, created_by)
      VALUES (
        ${id}, ${String(body.templateId ?? "").trim() || null}, ${title},
        ${message}, ${normalizeTarget(body.targetUrl)}, ${audienceValue},
        ${sendNow ? "pending" : "scheduled"},
        ${sendNow ? null : scheduledDate!.toISOString()},
        ${session?.email ?? "administrador"}
      )
    `;
    const delivery = sendNow ? await sendNotificationCampaign(id) : null;
    return Response.json({ id, scheduled: !sendNow, delivery });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { id?: string; action?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return Response.json({ error: "Notificação ausente." }, { status: 400 });
    if (body.action === "cancel") {
      await getSql()`
        UPDATE notification_campaigns
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND status IN ('scheduled', 'pending')
      `;
      return Response.json({ cancelled: true });
    }
    if (body.action === "sendNow") {
      await getSql()`
        UPDATE notification_campaigns
        SET status = 'pending', scheduled_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND status = 'scheduled'
      `;
      return Response.json({ delivery: await sendNotificationCampaign(id) });
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
