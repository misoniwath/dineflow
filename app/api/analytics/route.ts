import { NextResponse } from "next/server";
import { AnalyticsAccessError, requireAnalyticsManager } from "@/lib/auth/analytics";
import { resolveAnalyticsRequest } from "@/lib/analytics";
import { getSavedAnalytics } from "@/lib/db/analytics";
import { getRestaurantDate } from "@/lib/scheduling";

export async function GET(request: Request) {
  try {
    await requireAnalyticsManager();
    const query = resolveAnalyticsRequest(
      new URL(request.url).searchParams,
      getRestaurantDate(new Date().toISOString()),
    );
    const report = await getSavedAnalytics(
      query.range, query.selection, query.comparison,
    );
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AnalyticsAccessError || error instanceof RangeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error instanceof AnalyticsAccessError ? error.status : 400 },
      );
    }
    console.error("Failed to load analytics", error);
    return NextResponse.json(
      { message: "Could not load Analytics." },
      { status: 500 },
    );
  }
}
