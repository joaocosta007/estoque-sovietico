import { requireAdminApi } from "../../../../lib/auth";
import { processDueNotificationCampaigns } from "../../../../lib/push";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Acesso negado." }, { status: 401 });
  }
  return Response.json({ processed: await processDueNotificationCampaigns() });
}

export async function POST() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  return Response.json({ processed: await processDueNotificationCampaigns() });
}
