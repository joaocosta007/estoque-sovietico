import "server-only";

import webpush from "web-push";
import { getSql } from "../db";

type CampaignRow = {
  id: string;
  title: string;
  body: string;
  targetUrl: string;
  audience: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapidConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Chaves VAPID não configuradas.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function pushError(error: unknown) {
  if (typeof error === "object" && error && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode);
    const message =
      "body" in error && typeof (error as { body?: unknown }).body === "string"
        ? (error as { body: string }).body
        : error instanceof Error
          ? error.message
          : "Falha no provedor de push.";
    return { statusCode, message: message.slice(0, 500) };
  }
  return {
    statusCode: 0,
    message: error instanceof Error ? error.message.slice(0, 500) : "Falha inesperada.",
  };
}

export async function sendNotificationCampaign(campaignId: string) {
  vapidConfiguration();
  const sql = getSql();
  const claimed = await sql<CampaignRow[]>`
    UPDATE notification_campaigns
    SET status = 'sending', updated_at = CURRENT_TIMESTAMP
    WHERE id = ${campaignId}
      AND status IN ('pending', 'scheduled')
    RETURNING
      id, title, body, target_url AS "targetUrl", audience
  `;
  const campaign = claimed[0];
  if (!campaign) return { skipped: true, sent: 0, failed: 0 };

  const selectedId = campaign.audience.startsWith("subscription:")
    ? campaign.audience.slice("subscription:".length)
    : null;
  const subscriptions = selectedId
    ? await sql<SubscriptionRow[]>`
        SELECT id, endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE active = true AND id = ${selectedId}
      `
    : await sql<SubscriptionRow[]>`
        SELECT id, endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE active = true
        ORDER BY created_at
      `;

  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify({
    title: campaign.title,
    body: campaign.body,
    url: campaign.targetUrl,
    campaignId: campaign.id,
  });

  for (let offset = 0; offset < subscriptions.length; offset += 10) {
    const batch = subscriptions.slice(offset, offset + 10);
    await Promise.all(
      batch.map(async (subscription) => {
        const deliveryId = crypto.randomUUID();
        await sql`
          INSERT INTO notification_deliveries
            (id, campaign_id, subscription_id, status)
          VALUES (${deliveryId}, ${campaign.id}, ${subscription.id}, 'pending')
          ON CONFLICT (campaign_id, subscription_id) DO NOTHING
        `;
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          sent += 1;
          await sql`
            UPDATE notification_deliveries
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = ''
            WHERE campaign_id = ${campaign.id}
              AND subscription_id = ${subscription.id}
          `;
        } catch (error) {
          failed += 1;
          const detail = pushError(error);
          await sql`
            UPDATE notification_deliveries
            SET status = 'failed', error = ${detail.message}
            WHERE campaign_id = ${campaign.id}
              AND subscription_id = ${subscription.id}
          `;
          if (detail.statusCode === 404 || detail.statusCode === 410) {
            await sql`
              UPDATE push_subscriptions
              SET active = false, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${subscription.id}
            `;
          }
        }
      }),
    );
  }

  const status = failed === 0 ? "sent" : sent > 0 ? "partial" : "failed";
  await sql`
    UPDATE notification_campaigns
    SET status = ${status}, sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${campaign.id}
  `;
  return { skipped: false, sent, failed };
}

export async function processDueNotificationCampaigns(limit = 20) {
  const sql = getSql();
  const due = await sql<{ id: string }[]>`
    SELECT id
    FROM notification_campaigns
    WHERE status IN ('pending', 'scheduled')
      AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
    ORDER BY COALESCE(scheduled_at, created_at)
    LIMIT ${limit}
  `;
  const results = [];
  for (const campaign of due) {
    results.push({
      id: campaign.id,
      ...(await sendNotificationCampaign(campaign.id)),
    });
  }
  return results;
}
