"use client";
import { useEffect } from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Role, AuthUser, Credentials, LoginResult } from "@/types/Auth";
import { login as apiLogin, logout as apiLogout } from "@/lib/api/users"; // Import your API helper

/* ------------------------------------------------------------------ */
/* Roles                                                             */
/* ------------------------------------------------------------------ */
export const ROLES = ["guest", "staff", "manager", "owner"] as const;

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Guest",
  staff: "Staff",
  manager: "Manager",
  owner: "Owner",
};

/** Where each role lands after signing in. Adjust to your routes. */
export const ROLE_HOME: Record<Role, string> = {
  guest: "/order",
  staff: "/order",
  manager: "/",
  owner: "/",
};

const GUEST: AuthUser = {
  id: "guest",
  name: "Guest",
  role: "guest",
};

/* ------------------------------------------------------------------ */
/* Context                                                           */
/* ------------------------------------------------------------------ */
type AuthContextValue = {
  user: AuthUser | null;
  login: (credentials: Credentials) => Promise<LoginResult>;
  continueAsGuest: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            role: data.user.role,
          });
        }
      } catch (err) {
        console.error("Failed to restore session", err);
      }
    }

    checkSession();
  }, []);

  async function login({ email, password }: Credentials): Promise<LoginResult> {
    try {
      // Call the real API helper we created earlier
      const data = await apiLogin({ email, password });

      if (data.success && data.user) {
        const signedIn: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
        };
        setUser(signedIn);
        return { ok: true, user: signedIn };
      }

      return {
        ok: false,
        error: data.message || "Incorrect email or password.",
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || "Incorrect email or password.",
      };
    }
  }

  const continueAsGuest = () => setUser(GUEST);

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Logout API failed, clearing client state anyway", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
