import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { login as apiLogin, logout as apiLogout } from "@/lib/api/users";

// Mock the API module
jest.mock("@/lib/api/users", () => ({
  login: jest.fn(),
  logout: jest.fn(),
}));

// Cast them to Jest mock types so TypeScript recognizes mockResolvedValueOnce
const mockedLogin = apiLogin as jest.MockedFunction<typeof apiLogin>;
const mockedLogout = apiLogout as jest.MockedFunction<typeof apiLogout>;

describe("AuthStore API & Action Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successful login returns user and ok status", async () => {
    const mockUser = { id: "1", name: "Admin", role: "owner" };
    mockedLogin.mockResolvedValueOnce({ success: true, user: mockUser } as any);

    const credentials = { email: "admin@test.com", password: "password" };

    const result = await apiLogin(credentials);

    expect(mockedLogin).toHaveBeenCalledWith(credentials);
    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
  });

  test("failed login returns error message", async () => {
    mockedLogin.mockResolvedValueOnce({
      success: false,
      message: "Invalid credentials",
    } as any);

    const result = await apiLogin({ email: "wrong@test.com", password: "123" });

    expect(result.success).toBe(false);
    expect((result as any).message).toBe("Invalid credentials");
  });

  test("logout calls apiLogout successfully", async () => {
    mockedLogout.mockResolvedValueOnce({ success: true } as any);

    await apiLogout();

    expect(mockedLogout).toHaveBeenCalledTimes(1);
  });
});
