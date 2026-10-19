"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  User,
  UserRole,
  UserStatus,
  CreateUserBody,
  UpdateUserBody,
} from "@/types/User";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api/users";

/* ------------------------------------------------------------------ */
/* Types & Helpers                                                     */
/* ------------------------------------------------------------------ */
export const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Active",
  disabled: "Disabled",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export const statusBadge: Record<UserStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  disabled: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export const roleBadge: Record<UserRole, string> = {
  owner: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  manager: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  staff: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
];

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */
type UserContextValue = {
  users: User[];
  loading: boolean;
  loadData: (params?: any) => Promise<void>;
  addUser: (input: CreateUserBody) => Promise<User>;
  updateUserRecord: (id: string, input: UpdateUserBody) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const data = await getUsers(params);
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addUser = useCallback(
    async (input: CreateUserBody) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: User = {
        id: tempId,
        name: input.name,
        email: input.email,
        role: input.role as UserRole,
        isActive: input.isActive ?? true,
        lastLoginAt: "—",
        updatedAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString().slice(0, 10),
      };

      // Optimistic update
      setUsers((prev) => [...prev, optimistic]);

      try {
        const saved = await createUser(input);
        setUsers((prev) => prev.map((u) => (u.id === tempId ? saved : u)));
        return saved;
      } catch (error) {
        console.error("Failed to add user:", error);
        loadData();
        throw error;
      }
    },
    [loadData],
  );

  const updateUserRecord = useCallback(
    async (id: string, input: UpdateUserBody) => {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...input } : u)),
      );

      try {
        const saved = await updateUser(id, input);
        setUsers((prev) => prev.map((u) => (u.id === id ? saved : u)));
      } catch (error) {
        console.error("Failed to update user:", error);
        loadData();
      }
    },
    [loadData],
  );

  const removeUser = useCallback(
    async (id: string) => {
      // Optimistic update
      setUsers((prev) => prev.filter((u) => u.id !== id));

      try {
        await deleteUser(id);
      } catch (error) {
        console.error("Failed to delete user:", error);
        loadData();
      }
    },
    [loadData],
  );

  const value = useMemo(
    () => ({
      users,
      loading,
      loadData,
      addUser,
      updateUserRecord,
      removeUser,
    }),
    [users, loading, loadData, addUser, updateUserRecord, removeUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUsersStore() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUsersStore must be used inside <UserProvider>");
  }
  return ctx;
}
