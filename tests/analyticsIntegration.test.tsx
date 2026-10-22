import "@testing-library/jest-dom/jest-globals";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import AnalyticsView from "@/views/AnalyticsView";
import { createPaidAnalyticsReport, resolveAnalyticsRequest } from "@/lib/analytics";
import type { AnalyticsData } from "@/types/Analytics";

jest.mock("cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
jest.mock("@/components/analytics/SalesChartComponent", () => ({
  __esModule: true,
  default: ({ salesData, covers }: AnalyticsData & { covers: number }) => (
    <div role="img" aria-label="Sales chart">
      {salesData.reduce((sum, point) => sum + point.sales, 0)} cents; {covers} covers
      {salesData.map((point) => <span key={point.label}>{point.label}: {point.sales}</span>)}
    </div>
  ),
}));

const initialNow = "2026-10-22T05:00:00.000Z";
const mockFetch = jest.fn<typeof fetch>();
let paid = true;

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, redirected: false, json: async () => data } as Response;
}

function report(url: string) {
  const query = resolveAnalyticsRequest(new URL(url, "http://localhost").searchParams, "2026-10-22");
  return createPaidAnalyticsReport(paid ? [{
    paidAt: "2026-10-22T05:00:00.000Z", totalCents: 3000, guestCount: 2, orderCount: 2,
    items: [{ name: "Saved dinner", quantity: 3, unitPriceCents: 1000 }],
  }] : [], query.range, query.selection, query.comparison);
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(initialNow) });
  paid = true;
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url) => response(report(String(url))));
  global.fetch = mockFetch;
  URL.createObjectURL = jest.fn<typeof URL.createObjectURL>().mockReturnValue("blob:test-export");
  URL.revokeObjectURL = jest.fn<typeof URL.revokeObjectURL>();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("loads real payment totals and saved menu performance without demo records", async () => {
  render(<AnalyticsView initialNow={initialNow} />);
  expect(screen.getByText("Loading Analytics…")).toBeInTheDocument();
  expect(screen.queryByText("Net sales")).not.toBeInTheDocument();
  await screen.findByText("Net sales");
  const stat = screen.getByText("Net sales").parentElement!;
  expect(within(stat).getByText("$30.00")).toBeInTheDocument();
  expect(within(screen.getByText("Average ticket").parentElement!).getByText("$15.00")).toBeInTheDocument();
  expect(within(screen.getByText("Total orders").parentElement!).getByText("2")).toBeInTheDocument();
  expect(screen.getByText("Saved dinner")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Sales chart" })).toHaveTextContent("3000 cents; 2 covers");
  expect(mockFetch.mock.calls[0][0]).toBe("/api/analytics?range=Today");
  expect(screen.queryByText(/Demo dates/)).not.toBeInTheDocument();
});

test("shows zero sales and an empty-period message when there are no payments", async () => {
  paid = false;
  render(<AnalyticsView initialNow={initialNow} />);
  await screen.findByText("No payments recorded for this period.");
  expect(within(screen.getByText("Net sales").parentElement!).getByText("$0.00")).toBeInTheDocument();
  expect(screen.queryByText("Saved dinner")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
});

test("switches the monthly chart to weekly totals and keeps the weekly view daily", async () => {
  render(<AnalyticsView initialNow={initialNow} />);
  await screen.findByText("Saved dinner");
  fireEvent.click(screen.getByRole("button", { name: "This month" }));
  await screen.findByText("Oct 19–22: 3000");
  const chart = screen.getByRole("img", { name: "Sales chart" });
  expect(within(chart).getByText("Oct 1–4: 0")).toBeInTheDocument();
  expect(within(chart).getByText("Oct 5–11: 0")).toBeInTheDocument();
  expect(within(chart).getByText("Oct 12–18: 0")).toBeInTheDocument();
  expect(chart.querySelectorAll("span")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "This week" }));
  await screen.findByText("Oct 22: 3000");
  expect(screen.queryByText("Oct 19–22: 3000")).not.toBeInTheDocument();
});

test("displays load failures and retries instead of falling back to demo data", async () => {
  mockFetch.mockResolvedValueOnce(response({ message: "Analytics access denied" }, 403));
  render(<AnalyticsView initialNow={initialNow} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Analytics access denied");
  expect(screen.queryByText("Net sales")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry Analytics" }));
  await screen.findByText("Saved dinner");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("applies custom dates, validates the range, and blocks exports while dates are pending", async () => {
  render(<AnalyticsView initialNow={initialNow} />);
  await screen.findByText("Saved dinner");
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  await screen.findByText("Saved dinner");
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-20" } });
  fireEvent.change(screen.getByLabelText("End date (inclusive)"), { target: { value: "2026-10-21" } });
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Apply dates" }));
  await screen.findByText("No payments recorded for this period.");
  expect(mockFetch.mock.calls.at(-1)?.[0]).toBe("/api/analytics?range=Custom&startDate=2026-10-20&endDate=2026-10-21");
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();

  const calls = mockFetch.mock.calls.length;
  fireEvent.change(screen.getByLabelText("End date (inclusive)"), { target: { value: "2026-10-19" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply dates" }));
  expect(screen.getByRole("alert")).toHaveTextContent("End date must be on or after start date.");
  expect(mockFetch).toHaveBeenCalledTimes(calls);
});

test("ignores responses from an older selected period", async () => {
  render(<AnalyticsView initialNow={initialNow} />);
  await screen.findByText("Saved dinner");
  let finishOld!: (value: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "This week" }));
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "This month" }));
  await screen.findByText("Saved dinner");
  await act(async () => finishOld(response(report("/api/analytics?range=This+week"))));
  expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Oct 1, 2026 – Oct 22, 2026")).toBeInTheDocument();
});

test("exports the loaded report with current dates", async () => {
  let filename = "";
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download;
  });
  render(<AnalyticsView initialNow={initialNow} />);
  await screen.findByText("Saved dinner");
  fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Summary" }));
  expect(filename).toBe("dineflow-summary-today-2026-10-22-to-2026-10-22.csv");
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
});

test.each([
  { redirected: true },
  { data: { source: "payments", range: "Today", summary: {}, period: {} } },
])("handles redirected and malformed successful responses: %o", async ({ redirected, data }) => {
  mockFetch.mockResolvedValueOnce({ ...response(data), redirected: Boolean(redirected) } as Response);
  render(<AnalyticsView initialNow={initialNow} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(redirected ? "Please sign in again" : "Could not load Analytics.");
  expect(screen.queryByText("Net sales")).not.toBeInTheDocument();
});
