import { getSql } from "../../../../db";

type SubscriptionBody = {
  endpoint?: string;
  label?: string;
  keys?: { p256dh?: string; auth?: string };
};

function normalize(body: SubscriptionBody) {
  const endpoint = String(body.endpoint ?? "").trim();
  const p256dh = String(body.keys?.p256dh ?? "").trim();
  const auth = String(body.keys?.auth ?? "").trim();
  const label =
    String(body.label ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80) || "CELULAR SEM IDENTIFICAÇÃO";
  return { endpoint, p256dh, auth, label };
}

export async function POST(request: Request) {
  try {
    const subscription = normalize((await request.json()) as SubscriptionBody);
    let url: URL;
    try {
      url = new URL(subscription.endpoint);
    } catch {
      return Response.json({ error: "Assinatura inválida." }, { status: 400 });
    }
    if (
      url.protocol !== "https:" ||
      subscription.p256dh.length < 20 ||
      subscription.auth.length < 8
    ) {
      return Response.json({ error: "Assinatura inválida." }, { status: 400 });
    }

    const sql = getSql();
    await sql`
      INSERT INTO push_subscriptions
        (id, endpoint, p256dh, auth, label, active)
      VALUES (
        ${crypto.randomUUID()}, ${subscription.endpoint}, ${subscription.p256dh},
        ${subscription.auth}, ${subscription.label}, true
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        label = EXCLUDED.label,
        active = true,
        updated_at = CURRENT_TIMESTAMP
    `;
    return Response.json({ subscribed: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = String(body.endpoint ?? "").trim();
    if (!endpoint) {
      return Response.json({ error: "Assinatura ausente." }, { status: 400 });
    }
    await getSql()`
      UPDATE push_subscriptions
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE endpoint = ${endpoint}
    `;
    return Response.json({ subscribed: false });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
