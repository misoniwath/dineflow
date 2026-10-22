"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SalesChartComponent from "@/components/analytics/SalesChartComponent";
import HomeStatCardComponent from "@/components/HomeStatCardComponent";
import MenuPerformanceCardComponent from "@/components/analytics/MenuPerformanceCardComponent";
import { getAnalyticsApi } from "@/lib/api/analytics";
import { getRestaurantDate } from "@/lib/scheduling";
import {
  formatAnalyticsPeriod,
  getAnalyticsDateError,
  getPresetAnalyticsDates,
} from "@/lib/analytics";
import { createAnalyticsCsv } from "@/lib/analytics-export";
import type {
  AnalyticsDateRange,
  AnalyticsData,
  AnalyticsDateSelection,
  AnalyticsExportSection,
} from "@/types/Analytics";
import { money } from "@/lib/utils";

const rangeOptions: AnalyticsDateRange[] = [
  "Today",
  "This week",
  "This month",
  "Custom",
];
const exportOptions: { value: AnalyticsExportSection; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "sales-breakdown", label: "Sales breakdown" },
  { value: "menu-performance", label: "Menu performance" },
];

export default function AnalyticsView({ initialNow }: { initialNow: string }) {
  const [today, setToday] = useState(() => getRestaurantDate(initialNow));
  const [initialCustomDates] = useState(
    () => getPresetAnalyticsDates("This week", today).selection,
  );
  const [selectedRange, setSelectedRange] =
    useState<AnalyticsDateRange>("Today");
  const [customDates, setCustomDates] =
    useState<AnalyticsDateSelection>(initialCustomDates);
  const [draftDates, setDraftDates] =
    useState<AnalyticsDateSelection>(initialCustomDates);
  const [dateError, setDateError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: AnalyticsData | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  const requestKey = `${selectedRange}:${customDates.startDate}:${customDates.endDate}:${today}:${refreshCount}`;
  const loading = result.key !== requestKey;
  const analyticsData = loading ? null : result.data;
  const loadError = loading ? null : result.error;
  const periodLabel = analyticsData
    ? formatAnalyticsPeriod(analyticsData.period)
    : "";

  useEffect(() => {
    const updateDate = () => setToday(getRestaurantDate(new Date().toISOString()));
    const initialTick = window.setTimeout(updateDate, 0);
    const interval = window.setInterval(updateDate, 30_000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void getAnalyticsApi(selectedRange, customDates, controller.signal).then(
      (data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      },
      (cause: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            data: null,
            error: cause instanceof Error ? cause.message : "Could not load Analytics.",
          });
        }
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedRange, customDates, requestKey]);
  const hasPendingDates =
    selectedRange === "Custom" &&
    (draftDates.startDate !== customDates.startDate ||
      draftDates.endDate !== customDates.endDate);

  function handleApplyDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error =
      getAnalyticsDateError(draftDates) ??
      (draftDates.endDate > today ? "Choose dates on or before today." : null);
    setDateError(error);
    if (!error) setCustomDates({ ...draftDates });
  }

  function handleExportCsv(section: AnalyticsExportSection) {
    if (!analyticsData || hasPendingDates || dateError) return;
    const { content, filename } = createAnalyticsCsv(analyticsData, section);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const comparisonLabel = analyticsData?.comparisonPeriod
    ? `for ${formatAnalyticsPeriod(analyticsData.comparisonPeriod)}`
    : "in the previous period";
  const noComparisonNote = "Previous-period comparison unavailable.";

  return (
    <section
      className="space-y-6"
      aria-labelledby="analytics-heading"
      aria-busy={loading}
    >
      <header className="space-y-1">
        <h1 id="analytics-heading" className="text-2xl font-semibold">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Sales from recorded payments, dated in Asia/Phnom_Penh (UTC+07:00).
          Average ticket uses paid orders; covers use the guest count saved on each receipt.
        </p>
      </header>
      <div className="flex flex-wrap justify-end gap-2">
        {rangeOptions.map((range) => (
          <Button
            key={range}
            type="button"
            variant={selectedRange === range ? "default" : "outline"}
            aria-pressed={selectedRange === range}
            onClick={() => {
              setSelectedRange(range);
              setDateError(null);
              if (range === "Custom") setDraftDates({ ...customDates });
            }}
          >
            {range}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => setRefreshCount((count) => count + 1)}
        >
          <RefreshCw aria-hidden="true" /> Refresh
        </Button>
        <Menu.Root>
          <Menu.Trigger
            disabled={!analyticsData || loading || hasPendingDates || Boolean(dateError)}
            render={<Button type="button" variant="outline" />}
          >
            <Download aria-hidden="true" />
            Export CSV
            <ChevronDown aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              align="end"
              sideOffset={4}
              className="isolate z-50"
            >
              <Menu.Popup className="min-w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
                {exportOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onClick={() => handleExportCsv(option.value)}
                    className="cursor-default rounded-md px-3 py-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {selectedRange === "Custom" && (
        <form
          noValidate
          onSubmit={handleApplyDates}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-2 sm:w-44">
              <Label htmlFor="analytics-start-date">Start date</Label>
              <Input
                id="analytics-start-date"
                type="date"
                required
                max={today}
                value={draftDates.startDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={
                  dateError ? "analytics-date-error" : "analytics-date-help"
                }
                onChange={(event) => {
                  setDraftDates((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }));
                  setDateError(null);
                }}
              />
            </div>
            <div className="w-full space-y-2 sm:w-44">
              <Label htmlFor="analytics-end-date">End date (inclusive)</Label>
              <Input
                id="analytics-end-date"
                type="date"
                required
                max={today}
                value={draftDates.endDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={
                  dateError ? "analytics-date-error" : "analytics-date-help"
                }
                onChange={(event) => {
                  setDraftDates((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }));
                  setDateError(null);
                }}
              />
            </div>
            <Button type="submit">Apply dates</Button>
          </div>
          <p id="analytics-date-help" className="text-xs text-muted-foreground">
            Both dates are included. Choose up to 366 days ending today or earlier.
            Comparisons use the preceding period of the same length.
          </p>
          {dateError && (
            <p
              id="analytics-date-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {dateError}
            </p>
          )}
          {hasPendingDates && !dateError && (
            <p role="status" className="text-sm text-muted-foreground">
              Select Apply dates to update the report and enable exports.
            </p>
          )}
        </form>
      )}

      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading Analytics…
        </p>
      )}
      {loadError && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshCount((count) => count + 1)}
          >
            Retry Analytics
          </Button>
        </div>
      )}
      {analyticsData && (
        <>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
          {analyticsData.summary.totalOrders === 0 && (
            <p role="status" className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No payments recorded for this period.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <HomeStatCardComponent
              label="Net sales"
              value={money.format(analyticsData.summary.netSales / 100)}
              note={
                analyticsData.previousSummary
                  ? `Compared to ${money.format(analyticsData.previousSummary.netSales / 100)} ${comparisonLabel}`
                  : noComparisonNote
              }
            />
            <HomeStatCardComponent
              label="Average ticket"
              value={money.format(analyticsData.summary.averageTicket / 100)}
              note={
                analyticsData.previousSummary
                  ? `Compared to ${money.format(analyticsData.previousSummary.averageTicket / 100)} ${comparisonLabel}`
                  : noComparisonNote
              }
            />
            <HomeStatCardComponent
              label="Total orders"
              value={analyticsData.summary.totalOrders.toLocaleString("en-US")}
              note={
                analyticsData.previousSummary
                  ? `Compared to ${analyticsData.previousSummary.totalOrders.toLocaleString("en-US")} ${comparisonLabel}`
                  : noComparisonNote
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SalesChartComponent
              range={selectedRange}
              periodLabel={periodLabel}
              salesData={analyticsData.salesData}
              covers={analyticsData.summary.covers}
            />
            <MenuPerformanceCardComponent
              menuPerformance={analyticsData.menuPerformance}
            />
          </div>
        </>
      )}
    </section>
  );
}
