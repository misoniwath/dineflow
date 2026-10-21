"use client";
import { useMemo, useState, useEffect } from "react";

import { cn, money } from "@/lib/utils";
import {
  InventoryItem,
  ItemInput,
  StockStatus,
  FilterOption,
} from "@/types/Inventory";
import { Supplier } from "@/types/Supplier";
import { MenuItem, MenuInventoryItem } from "@/types/Menu";
import { STATUS_LABEL, getStatus, useInventory } from "@/stores/InventoryStore";

import StockBarComponent from "@/components/inventory/StockBarComponent";
import ExpiryCellComponent from "@/components/inventory/ExpiryCellComponent";
import RowActionsComponent from "@/components/inventory/RowActionsComponent";
import FilterPopoverComponent from "@/components/inventory/FilterPopoverComponent";
import StatusBadgeComponent from "@/components/StatusBadgeComponent";
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
import { LayoutGrid, List, Plus, Search, Trash2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InventoryView() {
  const {
    loading: isInventoryLoading,
    items,
    suppliers,
    menuItems,
    addItem,
    updateItem,
    removeItem,
    addSupplier,
    updateSupplier,
    removeSupplier,
    addMenuItem,
    updateMenuItem,
    removeMenuItem,
    loadData,
  } = useInventory();

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

  // Inventory Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  // Supplier Dialog States
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierNameInput, setSupplierNameInput] = useState("");
  const [supplierPhoneInput, setSupplierPhoneInput] = useState("");
  const [supplierEmailInput, setSupplierEmailInput] = useState("");
  const [supplierDeleteOpen, setSupplierDeleteOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );

  // Menu Item Dialog States
  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("Starters");
  const [menuDesc, setMenuDesc] = useState("");
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<
    MenuInventoryItem[]
  >([]);

  const [menuDeleteOpen, setMenuDeleteOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null);

  const availableCategories = ["Starters", "Mains", "Desserts", "Beverages"];
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

  const loading = isInventoryLoading;

  const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const qty = (n: number, unit: string) => `${qtyFmt.format(n)} ${unit}`;

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

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierNameInput("");
    setSupplierPhoneInput("");
    setSupplierEmailInput("");
    setSupplierFormOpen(true);
  };
  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierNameInput(s.name);
    setSupplierPhoneInput(s.phone);
    setSupplierEmailInput(s.email);
    setSupplierFormOpen(true);
  };
  const openDeleteSupplier = (s: Supplier) => {
    setDeletingSupplier(s);
    setSupplierDeleteOpen(true);
  };

  const openAddMenu = () => {
    setEditingMenu(null);
    setMenuName("");
    setMenuPrice("");
    setMenuCategory("Starters");
    setMenuDesc("");
    setRecipeIngredients([]);
    setMenuFormOpen(true);
  };

  const openEditMenu = (m: MenuItem) => {
    setEditingMenu(m);
    setMenuName(m.name);
    setMenuPrice((m.price / 100).toFixed(2));
    setMenuCategory(m.category ?? "Starters");
    setMenuDesc(m.desc ?? "");
    setRecipeIngredients(m.ingredients ?? []);
    setMenuFormOpen(true);
  };

  const openDeleteMenu = (m: MenuItem) => {
    setDeletingMenu(m);
    setMenuDeleteOpen(true);
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

  function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supplierNameInput,
        phone: supplierPhoneInput,
        email: supplierEmailInput,
      });
    } else {
      addSupplier({
        name: supplierNameInput,
        phone: supplierPhoneInput,
        email: supplierEmailInput,
      });
    }
    setSupplierFormOpen(false);
  }

  function confirmDeleteSupplier() {
    if (deletingSupplier) removeSupplier(deletingSupplier.id);
    setSupplierDeleteOpen(false);
  }

  function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault();
    const itemData: MenuItem = {
      id: editingMenu ? editingMenu.id : "",
      name: menuName,
      price: Math.round(parseFloat(menuPrice || "0") * 100),
      category: menuCategory as MenuItem["category"],
      desc: menuDesc,
      ingredients: recipeIngredients,
    };

    if (editingMenu) {
      updateMenuItem(editingMenu.id, itemData);
    } else {
      addMenuItem(itemData);
    }
    setMenuFormOpen(false);
  }

  function confirmDeleteMenu() {
    if (deletingMenu) removeMenuItem(deletingMenu.id);
    setMenuDeleteOpen(false);
  }

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

  const inventoryRows = useMemo(() => {
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

  const menuRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems
      .filter((m) => {
        if (
          q &&
          !m.name.toLowerCase().includes(q) &&
          !m.category?.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems, query]);

  const filtersActive =
    query.trim() !== "" || statusFilter.length > 0 || supplierFilter.length > 0;
  const pageCount = Math.max(1, Math.ceil(inventoryRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = inventoryRows.slice(start, start + PAGE_SIZE);

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

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(String(v))}
        className="space-y-4 "
      >
        {/* Tabs + dynamic add button */}
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
            <TabsTrigger
              value="menu"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Menu Catalog
              <span className="text-xs tabular-nums text-muted-foreground">
                {menuItems.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "items" && (
            <Button size="sm" onClick={openAdd} className="cursor-pointer">
              <Plus className="size-4" />
              Add item
            </Button>
          )}
          {tab === "suppliers" && (
            <Button
              size="sm"
              onClick={openAddSupplier}
              className="cursor-pointer"
            >
              <Plus className="size-4" />
              Add supplier
            </Button>
          )}
          {tab === "menu" && (
            <Button size="sm" onClick={openAddMenu} className="cursor-pointer">
              <Plus className="size-4" />
              Add menu item
            </Button>
          )}
        </div>

        {/* ---------------------------- Items ---------------------------- */}
        <TabsContent value="items" className="mt-0 space-y-4">
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

          {inventoryRows.length === 0 ? (
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
                          statusLabel={STATUS_LABEL}
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
                        statusLabel={STATUS_LABEL}
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

          {inventoryRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                Showing {start + 1}–{start + pageRows.length} of{" "}
                {inventoryRows.length}
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
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">No suppliers yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first supplier to manage your ingredient sources.
                </p>
              </div>
              <Button size="sm" onClick={openAddSupplier}>
                <Plus className="size-4" />
                Add supplier
              </Button>
            </div>
          ) : (
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

                    <div className="mt-auto pt-2 flex items-center justify-between border-t">
                      <Button
                        variant="outline"
                        size="sm"
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
                      <RowActionsComponent
                        item={s}
                        onEdit={openEditSupplier}
                        onDelete={openDeleteSupplier}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* -------------------------- Menu Catalog -------------------------- */}
        <TabsContent value="menu" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dishes or categories"
                className="pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
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

          {menuRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">No menu items yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first menu item to configure recipes and stock
                  deduction.
                </p>
              </div>
              <Button size="sm" onClick={openAddMenu}>
                <Plus className="size-4" />
                Add menu item
              </Button>
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Mapped Ingredients (Recipe)</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuRows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {money.format(m.price / 100)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.ingredients && m.ingredients.length > 0 ? (
                            m.ingredients.map((ing, idx) => {
                              const itemObj = items.find(
                                (i) => i.id === ing.inventoryItemId,
                              );
                              return (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {itemObj ? itemObj.name : "Unknown"}:{" "}
                                  {ing.quantityRequired} {itemObj?.unit}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No recipe mapped
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RowActionsComponent
                          item={m}
                          onEdit={openEditMenu}
                          onDelete={openDeleteMenu}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {menuItems.map((m) => {
                return (
                  <article
                    key={m.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">
                          {m.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.category}
                        </p>
                      </div>
                      <span className="text-base font-semibold tabular-nums">
                        {money.format(m.price)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Recipe Ingredients
                      </p>
                      <div className="flex flex-wrap gap-1 min-h-[36px]">
                        {m.ingredients && m.ingredients.length > 0 ? (
                          m.ingredients.map((ing, idx) => {
                            const itemObj = items.find(
                              (i) => i.id === ing.inventoryItemId,
                            );
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {itemObj ? itemObj.name : "Unknown"}:{" "}
                                {ing.quantityRequired} {itemObj?.unit}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No recipe mapped
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto border-t pt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {m.desc || "No description"}
                      </span>
                      <RowActionsComponent
                        item={m}
                        onEdit={openEditMenu}
                        onDelete={openDeleteMenu}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Inventory Dialog */}
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

      {/* Delete Inventory Confirmation */}
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

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={supplierFormOpen} onOpenChange={setSupplierFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editingSupplier
                ? `Edit Supplier: ${editingSupplier.name}`
                : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier's name details."
                : "Add a new vendor source for your inventory items."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Supplier Name</label>
              <Input
                value={supplierNameInput}
                onChange={(e) => setSupplierNameInput(e.target.value)}
                placeholder="e.g. Sysco Foods"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Supplier Phone</label>
              <Input
                value={supplierPhoneInput}
                onChange={(e) => setSupplierPhoneInput(e.target.value)}
                placeholder="e.g. Sysco Foods"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Supplier Email</label>
              <Input
                type="email"
                value={supplierEmailInput}
                onChange={(e) => setSupplierEmailInput(e.target.value)}
                placeholder="e.g. Sysco Foods"
                required
              />
            </div>
            <DialogFooter className="pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                {editingSupplier ? "Update Supplier" : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation */}
      <Dialog open={supplierDeleteOpen} onOpenChange={setSupplierDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deletingSupplier?.name}?</DialogTitle>
            <DialogDescription>
              This removes the supplier from your list. Make sure no active
              inventory items rely on it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteSupplier}>
              Remove supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Menu Item Dialog with Recipe Builder */}
      <Dialog open={menuFormOpen} onOpenChange={setMenuFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editingMenu
                ? `Edit Menu Item: ${editingMenu.name}`
                : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              Configure dish details and map required stock ingredients for
              automatic inventory deduction upon ordering.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMenu} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Dish Name</label>
                <Input
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="e.g. Truffle Pasta"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(e.target.value)}
                  placeholder="14.99"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Category</label>
                <Select
                  value={menuCategory}
                  onValueChange={(value) =>
                    setMenuCategory(value ?? "Starters")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Input
                  value={menuDesc}
                  onChange={(e) => setMenuDesc(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
            </div>

            {/* <div className="space-y-1"> */}
            {/*   <label className="text-xs font-medium">Menu Image</label> */}
            {/*   <Input */}
            {/*     type="file" */}
            {/*     accept="image/*" */}
            {/*     onChange={(e) => { */}
            {/*       const file = e.target.files?.[0]; */}
            {/*       if (file) { */}
            {/*         const reader = new FileReader(); */}
            {/*         reader.onloadend = () => { */}
            {/*           setMenuImage(reader.result as string); */}
            {/*         }; */}
            {/*         reader.readAsDataURL(file); */}
            {/*       } */}
            {/*     }} */}
            {/*   /> */}
            {/* </div> */}

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Recipe Ingredients (Stock Deduction)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRecipeIngredients((prev) => [
                      ...prev,
                      {
                        inventoryItemId: items[0]?.id || "",
                        quantityRequired: 1,
                      },
                    ])
                  }
                >
                  <Plus className="size-3.5 mr-1" /> Add Ingredient
                </Button>
              </div>

              {recipeIngredients.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No ingredients linked. Orders for this item will not reduce
                  stock levels automatically.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recipeIngredients.map((rec, index) => {
                    const selectedInvItem = items.find(
                      (i) => i.id === rec.inventoryItemId,
                    );
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border"
                      >
                        <select
                          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          value={rec.inventoryItemId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecipeIngredients((prev) =>
                              prev.map((item, idx) =>
                                idx === index
                                  ? { ...item, inventoryItemId: val }
                                  : item,
                              ),
                            );
                          }}
                        >
                          {items.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.unit})
                            </option>
                          ))}
                        </select>

                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={rec.quantityRequired}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRecipeIngredients((prev) =>
                              prev.map((item, idx) =>
                                idx === index
                                  ? { ...item, quantityRequired: val }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="Qty"
                        />

                        <span className="text-xs text-muted-foreground w-10">
                          {selectedInvItem?.unit ?? ""}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setRecipeIngredients((prev) =>
                              prev.filter((_, idx) => idx !== index),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                {editingMenu ? "Update Menu Item" : "Save Menu Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Menu Item Confirmation */}
      <Dialog open={menuDeleteOpen} onOpenChange={setMenuDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deletingMenu?.name}?</DialogTitle>
            <DialogDescription>
              This removes the dish from your menu catalog. You can&apos;t undo
              this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteMenu}>
              Remove dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
