"use client";
import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
  TableHead,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function InventoryView() {
  const items = [
    {
      name: "Arborio rice",
      onHand: "22 lb",
      pct: 88,
      par: "25 lb",
      low: "8 lb",
      expires: "Mar 2, 2027",
      status: "At par",
      supplier: "Milano Dry Goods",
    },
    {
      name: "Burrata",
      onHand: "14 pc",
      pct: 70,
      par: "20 pc",
      low: "6 pc",
      expires: "Sep 14, 2026",
      status: "At par",
      supplier: "Green Valley Farms",
    },
    {
      name: "Chicken breast",
      onHand: "0 lb",
      pct: 0,
      par: "35 lb",
      low: "10 lb",
      expires: "—",
      status: "Out of stock",
      supplier: "Riverside Meats",
    },
    {
      name: "Dried pappardelle",
      onHand: "14 lb",
      pct: 70,
      par: "20 lb",
      low: "6 lb",
      expires: "May 18, 2027",
      status: "At par",
      supplier: "Milano Dry Goods",
    },
    {
      name: "Heirloom tomato",
      onHand: "6 lb",
      pct: 20,
      par: "30 lb",
      low: "10 lb",
      expires: "Sep 15, 2026",
      status: "Low",
      supplier: "Green Valley Farms",
    },
    {
      name: "House red wine",
      onHand: "18 btl",
      pct: 75,
      par: "24 btl",
      low: "6 btl",
      expires: "—",
      status: "At par",
      supplier: "Bellwood Distributors",
    },
    {
      name: "IPA keg",
      onHand: "1 keg",
      pct: 25,
      par: "4 keg",
      low: "2 keg",
      expires: "Oct 20, 2026",
      status: "Low",
      supplier: "Bellwood Distributors",
    },
    {
      name: "Parmigiano",
      onHand: "9 lb",
      pct: 90,
      par: "10 lb",
      low: "3 lb",
      expires: "Jan 8, 2027",
      status: "At par",
      supplier: "Milano Dry Goods",
    },
    {
      name: "Salmon fillet",
      onHand: "34 pc",
      pct: 68,
      par: "50 pc",
      low: "15 pc",
      expires: "Sep 13, 2026",
      status: "At par",
      supplier: "Coastal Seafood Co.",
    },
    {
      name: "Shishito peppers",
      onHand: "11 lb",
      pct: 73,
      par: "15 lb",
      low: "4 lb",
      expires: "Sep 16, 2026",
      status: "At par",
      supplier: "Green Valley Farms",
    },
  ];
  const statusStyle: Record<string, string> = {
    "At par": "bg-emerald-500/15 text-emerald-400",
    Low: "bg-amber-500/15 text-amber-400",
    "Out of stock": "bg-red-500/15 text-red-400",
  };
  const barStyle: Record<string, string> = {
    "At par": "bg-emerald-500",
    Low: "bg-amber-500",
    "Out of stock": "bg-transparent",
  };
  const statusFilterOptions = [
    { value: "all", label: "Status: All" },
    { value: "at-par", label: "Status: At par" },
    { value: "low", label: "Status: Low" },
    { value: "out", label: "Status: Out of stock" },
  ];
  const supplierFilterOptions = [
    { value: "all", label: "Supplier: All" },
    { value: "bellwood", label: "Supplier: Bellwood Distributors" },
    { value: "coastal", label: "Supplier: Coastal Seafood Co." },
    { value: "green", label: "Supplier: Green Valley Farms" },
    { value: "milano", label: "Supplier: Milano Dry Goods" },
    { value: "riverside", label: "Supplier: Riverside Meats" },
  ];
  const suppliers = [
    { value: "bellwood", label: "Bellwood Distributors" },
    { value: "coastal", label: "Coastal Seafood Co." },
    { value: "green", label: "Green Valley Farms" },
    { value: "milano", label: "Milano Dry Goods" },
    { value: "riverside", label: "Riverside Meats" },
  ];
  const emptyForm = {
    name: "",
    unit: "pc",
    onHand: "",
    par: "",
    lowAt: "",
    expires: "",
    supplier: "",
  };
  const quantityFields = [
    { key: "onHand", label: "On hand" },
    { key: "par", label: "Par level" },
    { key: "lowAt", label: "Low-stock alert at" },
  ];
  const units = ["pc", "lb", "kg", "oz", "l", "btl", "keg", "case"];

  const [form, setForm] = useState(emptyForm);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  useEffect(() => {
    console.log(supplierFilter);
  }, [supplierFilter]);

  return (
    <div className="space-y-4">
      {/* Tabs + add button */}
      <div className="flex items-end justify-between border-b">
        <div className="flex gap-1">
          <button className="-mb-px border-b-2 border-foreground px-3 py-2.5 text-sm font-medium">
            Items
          </button>
          <button className="-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            Suppliers
          </button>
        </div>
        {/* Dialog */}
        <Dialog
          open={addItemDialogOpen}
          onOpenChange={() => setAddItemDialogOpen((prev) => !prev)}
        >
          <DialogTrigger render={<Button size="sm" className="mb-2" />}>
            <Plus className="size-4" />
            Add item
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl">
            <DialogHeader className="border-b pb-4">
              <DialogTitle>Add inventory item</DialogTitle>
              <DialogDescription>
                New items appear in the list and start sending stock alerts
                right away.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={() => console.log("Form submitted")}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">
                  Ingredient name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Meyer lemons"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Unit */}
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-muted-foreground">
                    Unit
                  </Label>
                  <Select
                    value={form.unit}
                    onValueChange={(v) => setForm({ ...form, unit: v ?? "pc" })}
                  >
                    <SelectTrigger id="unit" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* On hand, Par level, Low-stock alert at */}
                {quantityFields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label htmlFor={f.key} className="text-muted-foreground">
                      {f.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={f.key}
                        type="number"
                        min="0"
                        step="any"
                        className="pr-10"
                        value={form[f.key]}
                        onChange={(e) =>
                          setForm({ ...form, [f.key]: e.target.value })
                        }
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        {form.unit}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Expiry */}
                <div className="space-y-2">
                  <Label htmlFor="expires" className="text-muted-foreground">
                    Expiry date
                  </Label>
                  <Input
                    id="expires"
                    type="date"
                    value={form.expires}
                    onChange={(e) =>
                      setForm({ ...form, expires: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if it doesn't expire.
                  </p>
                </div>

                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-muted-foreground">
                    Supplier
                  </Label>
                  <Select
                    items={suppliers}
                    value={form.supplier || null}
                    onValueChange={(v) =>
                      setForm({ ...form, supplier: v ?? "" })
                    }
                  >
                    <SelectTrigger id="supplier" className="w-full">
                      <SelectValue placeholder="Choose a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  Cancel
                </DialogClose>
                <Button type="submit">Save item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search ingredients" className="pl-9" />
        </div>

        <Select
          items={statusFilterOptions}
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
          defaultValue="all"
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-full">
            {statusFilterOptions.map((options) => {
              return (
                <SelectItem key={options.value} value={options.value}>
                  {options.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          items={supplierFilterOptions}
          value={supplierFilter}
          onValueChange={(v) => setSupplierFilter(v ?? "all")}
          defaultValue="all"
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-full">
            {supplierFilterOptions.map((option) => {
              return (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Badge className="ml-auto rounded-full bg-red-500/15 text-red-400">
          4 below par
        </Badge>
      </div>

      {/* Table */}
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
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${barStyle[item.status]}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span>{item.onHand}</span>
                  </div>
                </TableCell>
                <TableCell>{item.par}</TableCell>
                <TableCell>{item.low}</TableCell>
                <TableCell>{item.expires}</TableCell>
                <TableCell>
                  <Badge
                    className={`rounded-full font-normal ${statusStyle[item.status]}`}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.supplier}</TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter className="bg-transparent">
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Showing 1–10 of 42</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled
                    >
                      ‹
                    </Button>
                    <Button size="icon" className="size-8">
                      1
                    </Button>
                    <Button variant="outline" size="icon" className="size-8">
                      2
                    </Button>
                    <Button variant="outline" size="icon" className="size-8">
                      3
                    </Button>
                    <Button variant="outline" size="icon" className="size-8">
                      4
                    </Button>
                    <Button variant="outline" size="icon" className="size-8">
                      5
                    </Button>
                    <Button variant="outline" size="icon" className="size-8">
                      ›
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
