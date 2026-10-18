"use client";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  FilterOption,
  UserRole,
  UserStatus,
  CreateUserBody,
  UpdateUserBody,
} from "@/types/User";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/api/users";

import FilterPopoverComponent from "@/components/user/FilterPopoverComponent";
import UserActionsComponent from "@/components/user/UserActionsComponent";
import StatusBadgeComponent from "@/components/StatusBadgeComponent";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Plus, Search } from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Active",
  disabled: "Disabled",
};

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

const statusBadge: Record<UserStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  disabled: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

const roleBadge: Record<UserRole, string> = {
  owner: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  manager: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  staff: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UserManagementView() {
  const [tab, setTab] = useState("users");
  const [view, setView] = useState<"list" | "card">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    return {
      q: query.trim() || undefined,
      status: statusFilter.length > 0 ? statusFilter.join(",") : undefined,
      role: roleFilter.length > 0 ? roleFilter.join(",") : undefined,
    };
  }, [query, statusFilter, roleFilter]);

  const loadUsers = async (params: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers(params);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(params);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadUsers(params);
  }, [statusFilter, roleFilter]);

  const openAdd = () => {
    setEditing(null);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  };

  const openDelete = (user: User) => {
    setDeleting(user);
    setDeleteOpen(true);
  };

  const activeUsers = users.filter((user) => user.isActive).length;

  const statusOptions: FilterOption[] = [
    {
      value: "active",
      label: "Active",
      count: users.filter((user) => user.isActive).length,
      dot: "bg-emerald-500",
    },
    {
      value: "disabled",
      label: "Disabled",
      count: users.filter((user) => !user.isActive).length,
      dot: "bg-slate-500",
    },
  ];

  const roleOptions: FilterOption[] = (
    ["owner", "manager", "staff"] as UserRole[]
  ).map((role) => ({
    value: role,
    label: ROLE_LABEL[role],
    count: users.filter((user) => user.role === role).length,
    dot:
      role === "owner"
        ? "bg-violet-500"
        : role === "manager"
          ? "bg-cyan-500"
          : "bg-slate-500",
  }));

  const rows = useMemo(() => {
    return users
      .filter((user) => {
        if (statusFilter.length) {
          if (statusFilter.includes("active") && !user.isActive) return false;
          if (statusFilter.includes("disabled") && user.isActive) return false;
        }
        if (roleFilter.length && !roleFilter.includes(user.role)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roleFilter, statusFilter, users]);

  const filtersActive =
    query.trim() !== "" || statusFilter.length > 0 || roleFilter.length > 0;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const firstPageBtn = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageButtons = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => firstPageBtn + index,
  );

  const handleSubmit = async (input: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    password?: string;
  }) => {
    try {
      setSaving(true);
      setError(null);

      if (editing) {
        const payload: UpdateUserBody = {
          name: input.name,
          email: input.email,
          role: input.role as any,
          isActive: input.status === "active",
          ...(input.password?.trim()
            ? { password: input.password.trim() }
            : {}),
        } as any;
        await updateUser(editing.id, payload);
      } else {
        const payload: CreateUserBody = {
          name: input.name,
          email: input.email,
          role: input.role as any,
          isActive: input.status === "active",
          password: input.password?.trim(),
        } as any;
        await createUser(payload);
      }

      setFormOpen(false);
      await loadUsers(query.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setSaving(true);
      setError(null);
      await deleteUser(deleting.id);
      setDeleteOpen(false);
      setDeleting(null);
      await loadUsers(query.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter([]);
    setRoleFilter([]);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="space-y-4"
      >
        <div className="flex flex-col items-end justify-between gap-3 lg:flex-row lg:items-center">
          <TabsList className="w-full lg:w-3/4">
            <TabsTrigger
              value="users"
              className="w-full cursor-pointer gap-2 px-3"
            >
              Users
              <span className="text-xs tabular-nums text-muted-foreground">
                {users.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="w-full cursor-pointer gap-2 px-3"
            >
              Roles
              <span className="text-xs tabular-nums text-muted-foreground">
                {Object.keys(ROLE_LABEL).length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "users" && (
            <Button size="sm" onClick={openAdd} className="cursor-pointer">
              <Plus className="size-4" />
              Add user
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <TabsContent value="users" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users, email or location"
                className="pl-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <FilterPopoverComponent
              title="Status"
              options={statusOptions}
              selected={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
            <FilterPopoverComponent
              title="Role"
              options={roleOptions}
              selected={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            />

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {activeUsers > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                  onClick={() => {
                    setStatusFilter(["active"]);
                    setPage(1);
                  }}
                >
                  {activeUsers} active
                </Button>
              )}

              <div
                role="group"
                aria-label="View"
                className="flex items-center rounded-lg border bg-muted p-0.5"
              >
                {(
                  [
                    { key: "list", label: "List view", icon: List },
                    { key: "card", label: "Card view", icon: LayoutGrid },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={view === key ? "default" : "ghost"}
                    size="icon"
                    className="size-7"
                    aria-label={label}
                    aria-pressed={view === key}
                    onClick={() => setView(key)}
                  >
                    <Icon className="size-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {filtersActive
                    ? "No users match your filters"
                    : "No users yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : "Add your first team member to get started."}
                </p>
              </div>
              {filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" />
                  Add user
                </Button>
              )}
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full text-xs font-medium text-white",
                              AVATAR_COLORS[
                                Math.abs(
                                  user.name
                                    .split("")
                                    .reduce(
                                      (sum, char) => sum + char.charCodeAt(0),
                                      0,
                                    ),
                                ) % AVATAR_COLORS.length
                              ],
                            )}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-full font-normal",
                            roleBadge[user.role],
                          )}
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadgeComponent
                          statusLabel={STATUS_LABEL}
                          status={user.isActive ? "active" : "disabled"}
                          statusBadge={statusBadge}
                        />
                      </TableCell>
                      <TableCell>{user.lastLoginAt ?? "N/A"}</TableCell>
                      <TableCell>
                        <UserActionsComponent
                          user={user}
                          onEdit={openEdit}
                          onDelete={openDelete}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageRows.map((user) => (
                <article
                  key={user.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-full text-sm font-medium text-white",
                          AVATAR_COLORS[
                            Math.abs(
                              user.name
                                .split("")
                                .reduce(
                                  (sum, char) => sum + char.charCodeAt(0),
                                  0,
                                ),
                            ) % AVATAR_COLORS.length
                          ],
                        )}
                      >
                        {getInitials(user.name)}
                      </div>
                    </div>

                    <StatusBadgeComponent
                      status={user.isActive ? "active" : "disabled"}
                      statusLabel={STATUS_LABEL}
                      statusBadge={statusBadge}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          "rounded-full font-normal",
                          roleBadge[user.role],
                        )}
                      >
                        {ROLE_LABEL[user.role]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {user.lastLoginAt ?? "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto border-t pt-3">
                    <UserActionsComponent
                      user={user}
                      onEdit={openEdit}
                      onDelete={openDelete}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                Showing {start + 1}–{start + pageRows.length} of {rows.length}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    ‹
                  </Button>
                  {pageButtons.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={
                        pageNumber === currentPage ? "default" : "outline"
                      }
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(pageNumber)}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={
                        pageNumber === currentPage ? "page" : undefined
                      }
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    ›
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["owner", "manager", "staff"] as UserRole[]).map((role) => {
              const members = users.filter((user) => user.role === role);
              const active = members.filter((user) => user.isActive).length;

              return (
                <article
                  key={role}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-2.5 rounded-full",
                          role === "owner"
                            ? "bg-violet-500"
                            : role === "manager"
                              ? "bg-cyan-500"
                              : role === "staff"
                                ? "bg-amber-500"
                                : "bg-slate-500",
                        )}
                      />
                      <h3 className="text-sm font-medium">
                        {ROLE_LABEL[role]}
                      </h3>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full font-normal",
                        roleBadge[role],
                      )}
                    >
                      {active} active
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto self-start"
                    onClick={() => {
                      setRoleFilter([role]);
                      setStatusFilter([]);
                      setQuery("");
                      setPage(1);
                      setTab("users");
                    }}
                  >
                    View users
                  </Button>
                </article>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes are applied immediately and update the team list right away."
                : "New members appear in the user list and can start using the workspace immediately."}
            </DialogDescription>
          </DialogHeader>

          <UserFormComponent
            key={formKey}
            user={editing}
            onSubmit={handleSubmit}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes them from the team. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserFormComponent({
  user,
  onSubmit,
  saving,
}: {
  user: User | null;
  onSubmit: (input: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    password?: string;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "staff");
  const [status, setStatus] = useState<UserStatus>(
    user?.isActive ? "active" : "disabled",
  );
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Full name</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as UserStatus)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Password {user ? "(optional)" : ""}
          </label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          disabled={saving}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              email: email.trim(),
              role,
              status,
              password: password.trim() || undefined,
            })
          }
        >
          {saving ? "Saving..." : user ? "Save changes" : "Add user"}
        </Button>
      </div>
    </div>
  );
}
