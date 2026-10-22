import "@testing-library/jest-dom/jest-globals";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import SchedulingView from "@/views/SchedulingView";
import type { ScheduleData } from "@/types/Scheduling";

jest.mock("@/components/ui/button", () => ({
  Button: ({
    variant,
    size,
    ...props
  }: ComponentProps<"button"> & { variant?: string; size?: string }) => {
    void variant;
    void size;
    return <button {...props} />;
  },
}));
jest.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
  uid: () => "draft-shift",
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock("@/components/ui/input", () => ({
  Input: (props: ComponentProps<"input">) => <input {...props} />,
}));
jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: ComponentProps<"textarea">) => <textarea {...props} />,
}));
jest.mock("@/components/ui/label", () => ({
  Label: (props: ComponentProps<"label">) => <label {...props} />,
}));

const initialNow = "2026-10-22T05:00:00.000Z";
const demoStaffNames = ["Ana", "Priya", "DeShawn", "Sokha", "Dara"];
const empty: ScheduleData = {
  currentUserId: "worker-1", canManageSchedule: true,
  staff: [], shifts: [], entries: [],
};
const schedule: ScheduleData = {
  currentUserId: "worker-1",
  canManageSchedule: true,
  staff: [
    { id: "worker-1", name: "Database worker", role: "manager", isActive: true },
    { id: "owner-1", name: "Database owner", role: "owner", isActive: false },
  ],
  shifts: [
    {
      id: "shift-1",
      staffId: "worker-1",
      startsAt: "2026-10-21T15:00:00.000Z",
      endsAt: "2026-10-21T19:00:00.000Z",
      notes: "Night shift",
    },
  ],
  entries: [
    {
      id: "entry-1",
      staffId: "worker-1",
      clockedInAt: "2026-10-21T15:00:00.000Z",
      clockedOutAt: null,
    },
    {
      id: "entry-2",
      staffId: "owner-1",
      clockedInAt: "2026-10-22T02:00:00.000Z",
      clockedOutAt: "2026-10-22T03:00:00.000Z",
    },
  ],
};

const mockFetch = jest.fn<typeof fetch>();
function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    redirected: false,
    json: async () => data,
  } as Response;
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(initialNow) });
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(response(empty));
  global.fetch = mockFetch;
});

afterEach(() => {
  jest.useRealTimers();
});

test("loads real staff, overnight shifts, and attendance", async () => {
  let finish!: (value: Response) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<SchedulingView initialNow={initialNow} />);

  expect(screen.getByText("Loading schedule…")).toBeInTheDocument();
  for (const name of demoStaffNames) {
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  }
  expect(screen.queryByText("Database worker")).not.toBeInTheDocument();

  await act(async () => finish(response(schedule)));
  expect(
    screen.getByRole("rowheader", { name: /Database worker/ }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Overnight/)).toBeInTheDocument();
  expect(screen.getByText(/Continues/)).toBeInTheDocument();
  expect(screen.getByText("1 clocked in")).toBeInTheDocument();
  expect(screen.getByText("Today’s records (2)")).toBeInTheDocument();
  expect(screen.getByLabelText("Role color legend")).toHaveTextContent("Manager");
  expect(screen.getByLabelText("Role color legend")).toHaveTextContent("Owner");
  expect(mockFetch.mock.calls[0][0]).toBe(
    "/api/scheduling?weekStart=2026-10-19",
  );

  expect(screen.getByRole("button", { name: "Add shift" })).toBeEnabled();
  const clockOut = screen.getByRole("button", {
    name: "Clock out Database worker",
  });
  expect(clockOut).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Clock in Database owner" }),
  ).not.toBeInTheDocument();
  expect(mockFetch.mock.calls.every(([, options]) => !options?.method)).toBe(
    true,
  );
});

test("saves clock-in once and loads the database entry after saving and refreshing", async () => {
  const entry = {
    id: "saved-entry",
    staffId: "worker-1",
    clockedInAt: "2026-10-22T05:01:00.000Z",
    clockedOutAt: null,
  };
  let persisted: ScheduleData = { ...schedule, entries: [] };
  let finish!: (value: Response) => void;
  mockFetch.mockImplementation(async (_url, options) =>
    options?.method === "POST"
      ? new Promise((resolve) => { finish = resolve; })
      : response(persisted),
  );
  render(<SchedulingView initialNow={initialNow} />);
  const button = await screen.findByRole("button", { name: "Clock in Database worker" });
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent("Clocking in…");
  expect(screen.getByRole("button", { name: "Refresh schedule" })).toBeDisabled();
  fireEvent.click(button);
  const posts = mockFetch.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0][0]).toBe("/api/scheduling/attendance");
  expect(JSON.parse(String(posts[0][1]?.body))).toEqual({ action: "clock-in" });

  persisted = { ...persisted, entries: [entry] };
  await act(async () => finish(response({ entry }, 201)));
  expect(await screen.findByRole("button", { name: "Clock out Database worker" })).toBeEnabled();
  expect(screen.getByText("1 clocked in")).toBeInTheDocument();
  expect(screen.getByText("In since 12:01 PM")).toBeInTheDocument();
  expect(screen.getByText("Database worker clocked in.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh schedule" }));
  expect(await screen.findByRole("button", { name: "Clock out Database worker" })).toBeEnabled();
  expect(screen.getByText("Today’s records (1)")).toBeInTheDocument();
});

test("clocks out the displayed overnight entry and keeps the saved history", async () => {
  const entry = { ...schedule.entries[0], clockedOutAt: "2026-10-22T05:01:00.000Z" };
  let persisted = schedule;
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === "POST") {
      expect(JSON.parse(String(options.body))).toEqual({
        action: "clock-out", entryId: "entry-1",
      });
      persisted = { ...schedule, entries: [entry, schedule.entries[1]] };
      return response({ entry });
    }
    return response(persisted);
  });
  render(<SchedulingView initialNow={initialNow} />);
  fireEvent.click(await screen.findByRole("button", { name: "Clock out Database worker" }));
  expect(await screen.findByRole("button", { name: "Clock in Database worker" })).toBeEnabled();
  expect(screen.getByText("0 clocked in")).toBeInTheDocument();
  expect(screen.getByText("Last out at 12:01 PM")).toBeInTheDocument();
  expect(screen.getByText("Today’s records (2)")).toBeInTheDocument();
  expect(screen.getByText("Database worker clocked out.")).toBeInTheDocument();
});

test("preserves attendance on a rejected save and recovers after a refresh", async () => {
  mockFetch.mockImplementation(async (_url, options) => options?.method === "POST"
    ? response({ message: "Attendance changed. Refresh and try again." }, 409)
    : response(schedule),
  );
  render(<SchedulingView initialNow={initialNow} />);
  fireEvent.click(await screen.findByRole("button", { name: "Clock out Database worker" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Attendance changed");
  expect(screen.getByText("1 clocked in")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Clock out Database worker" })).toBeEnabled();
  expect(screen.queryByText("Database worker clocked out.")).not.toBeInTheDocument();

  mockFetch.mockResolvedValue(response({ ...schedule, entries: [] }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh schedule" }));
  await screen.findByRole("button", { name: "Clock in Database worker" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("rejects a malformed successful attendance response without reporting success", async () => {
  mockFetch.mockImplementation(async (_url, options) => options?.method === "POST"
    ? response({ entry: { id: "invalid-entry" } })
    : response(schedule),
  );
  render(<SchedulingView initialNow={initialNow} />);
  fireEvent.click(await screen.findByRole("button", { name: "Clock out Database worker" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save attendance.");
  expect(screen.getByText("1 clocked in")).toBeInTheDocument();
});

test("staff see their own schedule and clock themselves out without sending an employee ID", async () => {
  const closed = { ...schedule.entries[0], clockedOutAt: "2026-10-22T05:01:00.000Z" };
  let personal: ScheduleData = {
    ...schedule,
    canManageSchedule: false,
    staff: [{ ...schedule.staff[0], role: "staff" }],
    entries: [schedule.entries[0]],
  };
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === "POST") {
      expect(JSON.parse(String(options.body))).toEqual({ action: "clock-out", entryId: "entry-1" });
      personal = { ...personal, entries: [closed] };
      return response({ entry: closed });
    }
    return response(personal);
  });
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByRole("heading", { name: "My schedule" });
  expect(screen.getByRole("heading", { name: "My attendance" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add shift" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Add shift for/ })).not.toBeInTheDocument();
  expect(screen.queryByText("Database owner")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Refresh schedule" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Clock out Database worker" }));
  expect(await screen.findByRole("button", { name: "Clock in Database worker" })).toBeEnabled();
  expect(screen.getByText("Last out at 12:01 PM")).toBeInTheDocument();
});

test("managers can view another active employee's attendance without clocking them in or out", async () => {
  mockFetch.mockResolvedValue(response({
    ...schedule,
    staff: [...schedule.staff, { id: "other-worker", name: "Other employee", role: "staff", isActive: true }],
    entries: [...schedule.entries, {
      id: "other-entry", staffId: "other-worker",
      clockedInAt: initialNow, clockedOutAt: null,
    }],
  }));
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByRole("rowheader", { name: /Other employee/ });
  expect(screen.getByText("2 clocked in")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Clock out Database worker" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: /Clock (in|out) Other employee/ })).not.toBeInTheDocument();
});

test("week navigation ignores older responses that finish after the latest week", async () => {
  mockFetch.mockResolvedValueOnce(response(schedule));
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByText(/Overnight/);

  let finishOld!: (value: Response) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOld = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next week" }));
  expect(screen.getByText("Loading schedule…")).toBeInTheDocument();
  expect(screen.queryByText(/Overnight/)).not.toBeInTheDocument();
  expect(mockFetch.mock.calls.at(-1)?.[0]).toBe(
    "/api/scheduling?weekStart=2026-10-26",
  );

  mockFetch.mockResolvedValueOnce(
    response({
      ...empty,
      staff: [{ ...schedule.staff[0], name: "Latest employee" }],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next week" }));
  await screen.findByRole("button", { name: "Clock in Latest employee" });
  expect(mockFetch.mock.calls.at(-1)?.[0]).toBe(
    "/api/scheduling?weekStart=2026-11-02",
  );

  await act(async () => finishOld(response(schedule)));
  expect(screen.queryByText("Database worker")).not.toBeInTheDocument();
  expect(
    screen.getByRole("rowheader", { name: /Latest employee/ }),
  ).toBeInTheDocument();
});

test("shows access errors and retries with empty data instead of samples", async () => {
  mockFetch.mockResolvedValueOnce(
    response({ message: "Scheduling access denied" }, 403),
  );
  render(<SchedulingView initialNow={initialNow} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Scheduling access denied",
  );
  expect(screen.queryByText("Attendance today")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Refresh schedule" }));
  await screen.findByText("No staff members found.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  for (const name of demoStaffNames) {
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  }
});

test("refresh replaces the displayed roster with the latest server data", async () => {
  mockFetch.mockResolvedValueOnce(response(schedule));
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByText(/Overnight/);

  fireEvent.click(screen.getByRole("button", { name: "Refresh schedule" }));
  await screen.findByText("No staff members found.");
  expect(screen.queryByText("Database worker")).not.toBeInTheDocument();
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
});

test("explains an expired login when the proxy redirects to an HTML login page", async () => {
  mockFetch.mockResolvedValueOnce({
    ...response(null),
    redirected: true,
    json: async () => {
      throw new SyntaxError("HTML response");
    },
  } as Response);
  render(<SchedulingView initialNow={initialNow} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please sign in again to use Scheduling.",
  );
});

test("rejects malformed successful responses and permits a retry", async () => {
  mockFetch.mockResolvedValueOnce(response({ staff: null }));
  render(<SchedulingView initialNow={initialNow} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load scheduling data.",
  );
  expect(
    screen.getByRole("button", { name: "Refresh schedule" }),
  ).toBeEnabled();
});

test("saves a shift once, then displays the server record through refresh", async () => {
  const saved = {
    id: "saved-shift",
    staffId: "worker-1",
    startsAt: "2026-10-22T04:00:00.000Z",
    endsAt: "2026-10-22T12:00:00.000Z",
    notes: "Lunch cover.",
  };
  let persisted = schedule;
  let finish!: (value: Response) => void;
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === "POST") {
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
    return response(persisted);
  });
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByText(/Overnight/);
  fireEvent.click(screen.getByRole("button", { name: "Add shift" }));
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).queryByRole("option", { name: /Database owner/ }),
  ).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("Notes (optional)"), {
    target: { value: "Lunch cover." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add shift" }));
  expect(
    within(dialog).getByRole("button", { name: "Saving…" }),
  ).toBeDisabled();
  expect(within(dialog).getByLabelText("Employee")).toBeDisabled();
  expect(screen.queryByText("Shift added.")).not.toBeInTheDocument();
  fireEvent.submit(dialog.querySelector("form")!);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
  const [, options] = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "POST",
  )!;
  expect(JSON.parse(String(options?.body))).toEqual({
    staffId: "worker-1",
    startsAt: "2026-10-22T11:00:00+07:00",
    endsAt: "2026-10-22T19:00:00+07:00",
    notes: "Lunch cover.",
  });

  persisted = { ...schedule, shifts: [...schedule.shifts, saved] };
  await act(async () => finish(response({ shift: saved }, 201)));
  await screen.findByTitle("Lunch cover.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Shift added.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh schedule" }));
  await screen.findByTitle("Lunch cover.");
});

test("keeps a rejected shift in the form and allows correction", async () => {
  mockFetch.mockImplementation(async (_url, options) =>
    options?.method === "POST"
      ? response(
          { message: "This employee already has a shift during that time." },
          409,
        )
      : response(schedule),
  );
  render(<SchedulingView initialNow={initialNow} />);
  await screen.findByText(/Overnight/);
  fireEvent.click(screen.getByRole("button", { name: "Add shift" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Add shift" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "already has a shift",
  );
  expect(
    within(dialog).getByRole("button", { name: "Add shift" }),
  ).toBeEnabled();
  expect(screen.queryByText("Shift added.")).not.toBeInTheDocument();
});
