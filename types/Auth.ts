import { ROLES } from "@/stores/AuthStore";

export type Role = (typeof ROLES)[number];

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
};

export type Credentials = {
  email: string;
  password: string;
};

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export type FieldErrors = { email?: string; password?: string };
