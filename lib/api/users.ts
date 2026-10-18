// Users Interface
import { User, UserRole, CreateUserBody, UpdateUserBody } from "@/types/User";
import { Credentials } from "@/types/Auth";

function mapApiUser(user: User): User {
  const role = (user as any).role as UserRole;
  const isActive = Boolean((user as any).isActive);
  return {
    id: String((user as any).id),
    name: String((user as any).name ?? ""),
    email: String((user as any).email ?? ""),
    role: role,
    lastLoginAt: String((user as any).lastLoginAt ?? "—"),
    updatedAt: String(
      (user as any).updatedAt ?? new Date().toISOString().slice(0, 10),
    ),
    createdAt: String(
      (user as any).createdAt ?? new Date().toISOString().slice(0, 10),
    ),
    isActive,
  };
}

export async function getUsers(params: any): Promise<User[]> {
  const filteredParams = Object.fromEntries(
    Object.entries(params || {}).filter(
      ([_, v]) => v !== undefined && v !== null,
    ),
  );

  const queryString =
    filteredParams && Object.keys(filteredParams).length > 0
      ? `?${new URLSearchParams(filteredParams as Record<string, string>).toString()}`
      : "";

  const url = `/api/users${queryString}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json().then((data: User[]) => data.map(mapApiUser));
}

export async function createUser(input: CreateUserBody) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error((await res.json()).error ?? "Failed to create user");
  return res.json().then((data: User) => mapApiUser(data));
}

export async function updateUser(id: string, input: UpdateUserBody) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error((await res.json()).error ?? "Failed to update user");
  return res.json().then((data: User) => mapApiUser(data));
}

export async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok)
    throw new Error((await res.json()).error ?? "Failed to delete user");
  return res.json();
}

export async function login(input: Credentials) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to login");
  return res.json();
}

export async function logout() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to logout");
  return data;
}
