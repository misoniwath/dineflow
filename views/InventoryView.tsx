"use client";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  InventoryItem,
  ItemInput,
  StockStatus,
  FilterOption,
} from "@/types/Inventory";
import { STATUS_LABEL, getStatus, useInventory } from "@/stores/InventoryStore";

import StatusBadgeComponent from "@/components/inventory/StatusBadgeComponent";
import StockBarComponent from "@/components/inventory/StockBarComponent";
import ExpiryCellComponent from "@/components/inventory/ExpiryCellComponent";
import RowActionsComponent from "@/components/inventory/RowActionsComponent";
import FilterPopoverComponent from "@/components/inventory/FilterPopoverComponent";
import ItemFormComponent from "@/components/inventory/ItemFormComponent";
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

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

const statusBadge: Record<StockStatus, string> = {
  "at-par": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  out: "bg-red-500/15 text-red-700 dark:text-red-400",
};
const statusBar: Record<StockStatus, string> = {
  "at-par": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-transparent",
};
const statusDot: Record<StockStatus, string> = {
  "at-par": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const qty = (n: number, unit: string) => `${qtyFmt.format(n)} ${unit}`;

/* ------------------------------------------------------------------ */
/* Inventory view                                                      */
/* ------------------------------------------------------------------ */
export default function InventoryView() {
  const { items, suppliers, addItem, updateItem, removeItem } = useInventory();
  const supplierName = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  const [tab, setTab] = useState("items");
  const [view, setView] = useState<"list" | "card">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Dialog state. The item being edited/deleted is kept after close so the
  // dialog content doesn't flicker during the close animation.
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openDelete = (item: InventoryItem) => {
    setDeleting(item);
    setDeleteOpen(true);
  };

  function handleSave(input: ItemInput) {
    if (editing) updateItem(editing.id, input);
    else addItem(input);
    setFormOpen(false);
  }
  function confirmDelete() {
    if (deleting) removeItem(deleting.id);
    setDeleteOpen(false);
  }

  /* Derived data */
  const belowPar = items.filter((i) => getStatus(i) !== "at-par").length;

  const statusOptions: FilterOption[] = (
    ["at-par", "low", "out"] as StockStatus[]
  ).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    dot: statusDot[s],
    count: items.filter((i) => getStatus(i) === s).length,
  }));

  const supplierOptions: FilterOption[] = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
    count: items.filter((i) => i.supplierId === s.id).length,
  }));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => {
        if (
          q &&
          !i.name.toLowerCase().includes(q) &&
          !supplierName[i.supplierId]?.toLowerCase().includes(q)
        )
          return false;
        if (statusFilter.length && !statusFilter.includes(getStatus(i)))
          return false;
        if (supplierFilter.length && !supplierFilter.includes(i.supplierId))
          return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query, statusFilter, supplierFilter, supplierName]);

  const filtersActive =
    query.trim() !== "" || statusFilter.length > 0 || supplierFilter.length > 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const firstPageBtn = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageButtons = Array.from(
    { length: Math.min(5, pageCount) },
    (_, i) => firstPageBtn + i,
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter([]);
    setSupplierFilter([]);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(String(v))}
        className="space-y-4"
      >
        {/* Tabs + add button */}
        <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-3">
          <TabsList className="w-full lg:w-3/4">
            <TabsTrigger
              value="items"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Items
              <span className="text-xs tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Suppliers
              <span className="text-xs tabular-nums text-muted-foreground">
                {suppliers.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "items" && (
            <Button size="sm" onClick={openAdd} className="cursor-pointer">
              <Plus className="size-4" />
              Add item
            </Button>
          )}
        </div>

        {/* ---------------------------- Items ---------------------------- */}
        <TabsContent value="items" className="mt-0 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ingredients or suppliers"
                className="pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <FilterPopoverComponent
              title="Status"
              options={statusOptions}
              selected={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
            <FilterPopoverComponent
              title="Supplier"
              options={supplierOptions}
              selected={supplierFilter}
              onChange={(v) => {
                setSupplierFilter(v);
                setPage(1);
              }}
              searchable
            />

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {belowPar > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400"
                  onClick={() => {
                    setStatusFilter(["low", "out"]);
                    setPage(1);
                  }}
                >
                  {belowPar} below par
                </Button>
              )}

              {/* List / card switch */}
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

          {/* Results */}
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {filtersActive
                    ? "No items match your filters"
                    : "No items yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : "Add your first ingredient to start tracking stock."}
                </p>
              </div>
              {filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" />
                  Add item
                </Button>
              )}
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead>Low-stock at</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StockBarComponent
                            statusBar={statusBar}
                            item={item}
                            className="w-24"
                          />
                          <span className="tabular-nums">
                            {qty(item.onHand, item.unit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {qty(item.par, item.unit)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {qty(item.lowAt, item.unit)}
                      </TableCell>
                      <TableCell>
                        <ExpiryCellComponent iso={item.expires} />
                      </TableCell>
                      <TableCell>
                        <StatusBadgeComponent
                          statusBadge={statusBadge}
                          status={getStatus(item)}
                        />
                      </TableCell>
                      <TableCell>{supplierName[item.supplierId]}</TableCell>
                      <TableCell>
                        <RowActionsComponent
                          item={item}
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
              {pageRows.map((item) => {
                const status = getStatus(item);
                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">
                          {item.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {supplierName[item.supplierId]}
                        </p>
                      </div>
                      <StatusBadgeComponent
                        statusBadge={statusBadge}
                        status={status}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xl font-semibold tabular-nums">
                          {qty(item.onHand, item.unit)}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          of {qty(item.par, item.unit)} par
                        </span>
                      </div>
                      <StockBarComponent statusBar={statusBar} item={item} />
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Low-stock at
                        </dt>
                        <dd className="tabular-nums">
                          {qty(item.lowAt, item.unit)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Expires
                        </dt>
                        <dd>
                          <ExpiryCellComponent iso={item.expires} />
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto border-t pt-3">
                      <RowActionsComponent
                        item={item}
                        onEdit={openEdit}
                        onDelete={openDelete}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
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
                  {pageButtons.map((p) => (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
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

        {/* -------------------------- Suppliers -------------------------- */}
        <TabsContent value="suppliers" className="mt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s) => {
              const theirs = items.filter((i) => i.supplierId === s.id);
              const low = theirs.filter(
                (i) => getStatus(i) !== "at-par",
              ).length;
              return (
                <article
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium">{s.name}</h3>
                    {low > 0 && (
                      <Badge
                        className={cn(
                          "rounded-full font-normal",
                          statusBadge.low,
                        )}
                      >
                        {low} below par
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {theirs.length} {theirs.length === 1 ? "item" : "items"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto self-start"
                    onClick={() => {
                      setSupplierFilter([s.id]);
                      setStatusFilter([]);
                      setQuery("");
                      setPage(1);
                      setTab("items");
                    }}
                  >
                    View items
                  </Button>
                </article>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add inventory item"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes update the list and stock alerts right away."
                : "New items appear in the list and start sending stock alerts right away."}
            </DialogDescription>
          </DialogHeader>
          <ItemFormComponent
            key={formKey}
            item={editing}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes it from your inventory. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
