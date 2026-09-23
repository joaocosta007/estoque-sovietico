import "server-only";

import { getSql } from "../db";

type LedgerRow = {
  id: string;
  customerId: string;
  type: "debit" | "payment";
  amountCents: number;
  description: string;
  saleId: string | null;
  dueDate: string | null;
  lateFeeForId: string | null;
  createdAt: string;
};

function chargeDate(row: LedgerRow) {
  if (row.dueDate) return new Date(`${row.dueDate}T00:00:00Z`);
  return new Date(row.createdAt.replace(" ", "T") + "Z");
}

function isOlderThanThirtyDays(row: LedgerRow, now: Date) {
  const date = chargeDate(row);
  return Number.isFinite(date.getTime()) && now.getTime() - date.getTime() >= 30 * 24 * 60 * 60 * 1000;
}

/**
 * Creates one separate 10% late-fee debit for each overdue original purchase.
 * Payments are allocated FIFO to purchases so a fully settled purchase never
 * receives a late fee. The late fee itself is marked with late_fee_for_id and
 * is never charged again.
 */
export async function applyLateFees() {
  const sql = getSql();
  const now = new Date();
  await sql.begin(async (tx) => {
    const rows = await tx<LedgerRow[]>`
      SELECT
        id, customer_id AS "customerId", type, amount_cents AS "amountCents",
        description, sale_id AS "saleId", due_date AS "dueDate",
        late_fee_for_id AS "lateFeeForId", created_at AS "createdAt"
      FROM customer_ledger
      ORDER BY customer_id, created_at, id
      FOR UPDATE
    `;

    const byCustomer = new Map<string, LedgerRow[]>();
    for (const row of rows) {
      const list = byCustomer.get(row.customerId) ?? [];
      list.push(row);
      byCustomer.set(row.customerId, list);
    }

    for (const customerRows of byCustomer.values()) {
      // Payments are allocated FIFO: the oldest purchase is settled first,
      // even though the payment was registered after that purchase.
      let paymentPool = customerRows
        .filter((row) => row.type === "payment")
        .reduce((total, row) => total + row.amountCents, 0);
      const debitRows = customerRows.filter((row) => row.type === "debit");

      for (const row of debitRows) {
        const remaining = Math.max(0, row.amountCents - paymentPool);
        paymentPool = Math.max(0, paymentPool - row.amountCents);
        if (
          row.lateFeeForId ||
          !isOlderThanThirtyDays(row, now) ||
          remaining <= 0
        ) {
          continue;
        }

        const feeCents = Math.max(1, Math.ceil(remaining * 0.1));
        await tx`
          INSERT INTO customer_ledger
            (id, customer_id, type, amount_cents, description,
             sale_id, due_date, late_fee_for_id)
          VALUES (
            ${crypto.randomUUID()}, ${row.customerId}, 'debit', ${feeCents},
            ${`Acréscimo de atraso (10%) sobre ${row.description}`},
            ${row.saleId}, ${row.dueDate}, ${row.id}
          )
          ON CONFLICT (late_fee_for_id) DO NOTHING
        `;
      }
    }
  });
}
