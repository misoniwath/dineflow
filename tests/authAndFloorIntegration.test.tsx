import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/stores/AuthStore";
import { FloorProvider, useFloor } from "@/stores/FloorStore";
import * as apiUsers from "@/lib/api/users";
import * as apiFloors from "@/lib/api/floors";

// Mock the underlying API modules
jest.mock("@/lib/api/users", () => ({
  login: jest.fn(),
  logout: jest.fn(),
}));

jest.mock("@/lib/api/floors", () => ({
  getFloorTables: jest.fn(),
  addFloorTable: jest.fn(),
  updateFloorTable: jest.fn(),
  deleteFloorTable: jest.fn(),
}));

const mockedLogin = apiUsers.login as jest.MockedFunction<
  typeof apiUsers.login
>;
const mockedGetTables = apiFloors.getFloorTables as jest.MockedFunction<
  typeof apiFloors.getFloorTables
>;
const mockedUpdateTable = apiFloors.updateFloorTable as jest.MockedFunction<
  typeof apiFloors.updateFloorTable
>;

// Combined Component using both Auth and Floor contexts
function DashboardComponent() {
  const { user, login } = useAuth();
  const { tables, loadData, setStatus } = useFloor();

  return (
    <div>
      <span data-testid="user-role">{user ? user.role : "Guest"}</span>
      <button
        onClick={() =>
          login({ email: "manager@test.com", password: "password" })
        }
      >
        Login Manager
      </button>

      <button onClick={() => loadData()}>Load Tables</button>
      <span data-testid="table-count">{tables.length}</span>
      {tables.map((t) => (
        <div key={t.id} data-testid={`table-${t.number}`}>
          {t.number} - {t.status}
          <button onClick={() => setStatus(t.id, "occupied")}>Occupy</button>
        </div>
      ))}
    </div>
  );
}

describe("Auth and Floor Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("allows user login and loading floor tables within context providers", async () => {
    mockedLogin.mockResolvedValueOnce({
      success: true,
      user: { id: "m1", name: "Manager Bob", role: "manager" },
    });

    mockedGetTables.mockResolvedValueOnce([
      {
        id: "t1",
        number: "10",
        seats: 4,
        zone: "Main Hall",
        status: "free",
        guests: 0,
        x: 10,
        y: 10,
      },
    ]);

    mockedUpdateTable.mockResolvedValueOnce({ success: true } as any);

    render(
      <AuthProvider>
        <FloorProvider>
          <DashboardComponent />
        </FloorProvider>
      </AuthProvider>,
    );

    // Initial state: Guest & no tables loaded
    expect(screen.getByTestId("user-role")).toHaveTextContent("Guest");
    expect(screen.getByTestId("table-count")).toHaveTextContent("0");

    // Perform Login
    fireEvent.click(screen.getByText("Login Manager"));
    await waitFor(() => {
      expect(screen.getByTestId("user-role")).toHaveTextContent("manager");
    });

    // Load Floor Data
    fireEvent.click(screen.getByText("Load Tables"));
    await waitFor(() => {
      expect(screen.getByTestId("table-count")).toHaveTextContent("1");
      expect(screen.getByTestId("table-10")).toHaveTextContent("10 - free");
    });

    // Change Table Status to Occupied
    fireEvent.click(screen.getByText("Occupy"));
    await waitFor(() => {
      expect(mockedUpdateTable).toHaveBeenCalled();
    });
  });
});
