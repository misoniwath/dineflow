import "server-only";

import { and, asc, count, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { billPaymentOrders, billPayments } from "@/lib/db/schema";
import { addAnalyticsDays, createPaidAnalyticsReport } from "@/lib/analytics";
import type { AnalyticsDateRange, AnalyticsDateSelection } from "@/types/Analytics";

export async function getSavedAnalytics(
  range: AnalyticsDateRange,
  selection: AnalyticsDateSelection,
  comparison: AnalyticsDateSelection,
) {
  function paidDuring(dates: AnalyticsDateSelection) {
    return and(
      gte(billPayments.paidAt, new Date(`${dates.startDate}T00:00:00+07:00`)),
      lt(billPayments.paidAt, new Date(`${addAnalyticsDays(dates.endDate, 1)}T00:00:00+07:00`)),
    );
  }
  // Group each receipt once so combined bills do not multiply revenue or covers.
  const receipts = await db.select({
    id: billPayments.id,
    paidAt: billPayments.paidAt,
    totalCents: billPayments.totalCents,
    guestCount: billPayments.guestCount,
    items: billPayments.items,
    orderCount: count(billPaymentOrders.orderId),
  }).from(billPayments)
    .leftJoin(billPaymentOrders, eq(billPaymentOrders.paymentId, billPayments.id))
    .where(or(paidDuring(selection), paidDuring(comparison)))
    .groupBy(billPayments.id)
    .orderBy(asc(billPayments.paidAt), asc(billPayments.id));
  return createPaidAnalyticsReport(
    receipts.map((receipt) => ({ ...receipt, paidAt: receipt.paidAt.toISOString() })),
    range, selection, comparison,
  );
}
