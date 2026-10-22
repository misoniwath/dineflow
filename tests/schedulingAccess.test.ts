/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { proxy } from "@/proxy";
import { navItems } from "@/lib/navItems";

jest.mock("jose", () => ({ jwtVerify: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});

test.each(["staff", "manager", "owner"])(
  "%s can open scheduling and find it in navigation",
  async (role) => {
    jest.mocked(jwtVerify).mockResolvedValue({ payload: { role } } as never);
    const result = await proxy(new NextRequest("http://localhost/scheduling", {
      headers: { cookie: "auth_token=token" },
    }));
    expect(result.headers.get("x-middleware-next")).toBe("1");
    expect(navItems.find((item) => item.href === "/scheduling")?.roles).toContain(role);
  },
);

test("guests must sign in before opening scheduling", async () => {
  const result = await proxy(new NextRequest("http://localhost/scheduling"));
  expect(new URL(result.headers.get("location")!).pathname).toBe("/login");
  expect(navItems.find((item) => item.href === "/scheduling")?.roles).not.toContain("guest");
});
