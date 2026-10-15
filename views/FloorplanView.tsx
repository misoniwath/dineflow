"use client";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, Minus, Pencil, Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  STATUS_LABEL,
  ZONES,
  useFloor,
  type FloorTable,
  type TableInput,
  type TableShape,
  type TableStatus,
  type Zone,
} from "@/stores/FloorStore";

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// Same visual language as the Home page: free = outline, occupied = filled,
// reserved = dashed. Cleaning adds an amber tint.
const tableStyle: Record<TableStatus, string> = {
  free: "border bg-card text-foreground hover:bg-muted",
  occupied: "border border-primary bg-primary text-primary-foreground",
  reserved: "border-2 border-dashed border-primary bg-card text-foreground",
  cleaning: "border border-amber-500/60 bg-amber-500/15 text-foreground",
};

const swatchStyle: Record<TableStatus, string> = {
  free: "border bg-card",
  occupied: "border border-primary bg-primary",
  reserved: "border border-dashed border-primary bg-card",
  cleaning: "border border-amber-500/60 bg-amber-500/15",
};

const statusBadge: Record<TableStatus, string> = {
  free: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  occupied: "bg-primary text-primary-foreground",
  reserved:
    "border border-dashed border-primary bg-transparent text-foreground",
  cleaning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const shapeOptions: { value: TableShape; label: string }[] = [
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
  { value: "rect", label: "Rectangle" },
];

/** Fixed parts of each room, so the canvas reads as a floor plan. */
const landmarks: Record<Zone, { label: string; className: string }[]> = {
  "Main hall": [
    { label: "Kitchen pass", className: "inset-x-16 top-0 h-6" },
    {
      label: "Entrance",
      className: "bottom-0 left-1/2 h-6 w-40 -translate-x-1/2",
    },
  ],
  Patio: [
    {
      label: "Doors to main hall",
      className: "inset-y-16 left-0 w-6 [writing-mode:vertical-rl] rotate-180",
    },
  ],
  Bar: [{ label: "Bar counter", className: "inset-x-8 top-0 h-8" }],
};

function tableBox(t: FloorTable) {
  const base = t.seats <= 2 ? 64 : t.seats <= 4 ? 80 : 96;
  return t.shape === "rect"
    ? { width: Math.round(base * 1.6), height: base }
    : { width: base, height: base };
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

type FormState = { number: string; seats: string; shape: string; zone: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TableForm({
  table,
  defaultZone,
  nextNumber,
  onSubmit,
  onRemove,
}: {
  table: FloorTable | null;
  defaultZone: Zone;
  nextNumber: number;
  onSubmit: (input: TableInput) => void;
  onRemove: () => void;
}) {
  const { tables } = useFloor();
  const [form, setForm] = useState<FormState>(() => ({
    number: String(table?.number ?? nextNumber),
    seats: String(table?.seats ?? 4),
    shape: table?.shape ?? "square",
    zone: table?.zone ?? defaultZone,
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmRemove, setConfirmRemove] = useState(false);

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const number = Number(form.number);
    const seats = Number(form.seats);

    const next: FormErrors = {};
    if (!Number.isInteger(number) || number < 1)
      next.number = "Enter a whole number, 1 or higher.";
    else if (tables.some((t) => t.id !== table?.id && t.number === number))
      next.number = `Table ${number} already exists.`;
    if (!Number.isInteger(seats) || seats < 1 || seats > 12)
      next.seats = "Enter between 1 and 12 seats.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      number,
      seats,
      shape: form.shape as TableShape,
      zone: form.zone as Zone,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field id="number" label="Table number" error={errors.number}>
          <Input
            id="number"
            type="number"
            min="1"
            value={form.number}
            aria-invalid={!!errors.number}
            onChange={(e) => set("number", e.target.value)}
          />
        </Field>
        <Field id="seats" label="Seats" error={errors.seats}>
          <Input
            id="seats"
            type="number"
            min="1"
            max="12"
            value={form.seats}
            aria-invalid={!!errors.seats}
            onChange={(e) => set("seats", e.target.value)}
          />
        </Field>
        <Field id="shape" label="Shape">
          <Select
            items={shapeOptions}
            value={form.shape}
            onValueChange={(v) => set("shape", v ?? "square")}
          >
            <SelectTrigger id="shape" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shapeOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="zone" label="Area">
          <Select
            value={form.zone}
            onValueChange={(v) => set("zone", v ?? defaultZone)}
          >
            <SelectTrigger id="zone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONES.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <DialogFooter className="sm:justify-between">
        {table ? (
          <Button
            type="button"
            variant={confirmRemove ? "destructive" : "outline"}
            className={cn(!confirmRemove && "text-destructive")}
            onClick={() =>
              confirmRemove ? onRemove() : setConfirmRemove(true)
            }
          >
            {confirmRemove ? "Confirm remove" : "Remove table"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit">{table ? "Save changes" : "Add table"}</Button>
        </div>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Floor plan view                                                     */
/* ------------------------------------------------------------------ */

export default function FloorPlanView() {
  const { tables, addTable, updateTable, setStatus, removeTable } = useFloor();

  const [zone, setZone] = useState<Zone>(ZONES[0]);
  const [editMode, setEditMode] = useState(false);

  // Status sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  // Add / edit dialog (editing is kept after close to avoid content flicker)
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<FloorTable | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    sx: number;
    sy: number;
    moved: boolean;
  } | null>(null);

  const zoneTables = tables.filter((t) => t.zone === zone);
  const countBy = (s: TableStatus) =>
    tables.filter((t) => t.status === s).length;
  const seatedGuests = tables.reduce((sum, t) => sum + t.guests, 0);
  const nextNumber = tables.reduce((max, t) => Math.max(max, t.number), 0) + 1;

  /* Open things */
  function openDetails(t: FloorTable) {
    setSelectedId(t.id);
    setSheetOpen(true);
  }
  function openAdd() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function openEdit(t: FloorTable) {
    setEditing(t);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function handleSave(input: TableInput) {
    if (editing) updateTable(editing.id, input);
    else addTable(input);
    setFormOpen(false);
  }
  function handleRemove() {
    if (editing) removeTable(editing.id);
    setFormOpen(false);
  }

  /* Dragging (edit mode only) */
  function onPointerDown(e: PointerEvent<HTMLButtonElement>, t: FloorTable) {
    if (!editMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: t.id, sx: e.clientX, sy: e.clientY, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>, t: FloorTable) {
    const d = drag.current;
    if (!d || d.id !== t.id || !canvasRef.current) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    d.moved = true;
    const rect = canvasRef.current.getBoundingClientRect();
    updateTable(t.id, {
      x: round1(clamp(((e.clientX - rect.left) / rect.width) * 100, 8, 92)),
      y: round1(clamp(((e.clientY - rect.top) / rect.height) * 100, 12, 88)),
    });
  }
  function onPointerUp(_e: PointerEvent<HTMLButtonElement>, t: FloorTable) {
    const d = drag.current;
    drag.current = null;
    // A press with no movement counts as a click: open the edit dialog.
    if (d && d.id === t.id && !d.moved) openEdit(t);
  }
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, t: FloorTable) {
    if (!editMode) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-2, 0],
      ArrowRight: [2, 0],
      ArrowUp: [0, -2],
      ArrowDown: [0, 2],
    };
    const delta = moves[e.key];
    if (delta) {
      e.preventDefault();
      updateTable(t.id, {
        x: clamp(t.x + delta[0], 8, 92),
        y: clamp(t.y + delta[1], 12, 88),
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEdit(t);
    }
  }

  return (
    <div className="space-y-4">
      {/* Zone tabs + edit controls */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-3">
        <Tabs
          value={zone}
          onValueChange={(v) => setZone(v as Zone)}
          className="w-full lg:w-3/4"
        >
          <TabsList className="w-full">
            {ZONES.map((z) => (
              <TabsTrigger
                key={z}
                value={z}
                className="cursor-pointer gap-2 px-3 w-full"
              >
                {z}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {tables.filter((t) => t.zone === z).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {editMode && (
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus className="size-4" />
              Add table
            </Button>
          )}
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            aria-pressed={editMode}
            onClick={() => {
              setEditMode((v) => !v);
              setSheetOpen(false);
            }}
          >
            {editMode ? (
              <Check className="size-4" />
            ) : (
              <Pencil className="size-4" />
            )}
            {editMode ? "Done" : "Edit layout"}
          </Button>
        </div>
      </div>

      {/* Legend + totals */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {STATUSES.map((s) => (
          <span
            key={s}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className={cn("size-3.5 rounded-sm", swatchStyle[s])} />
            {STATUS_LABEL[s]}
            <span className="tabular-nums text-foreground">{countBy(s)}</span>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-4" />
          <span className="tabular-nums text-foreground">{seatedGuests}</span>
          guests seated
        </span>
      </div>

      <p className="min-h-5 text-sm text-muted-foreground">
        {editMode
          ? "Drag tables to move them. Select one to change its seats or remove it. Arrow keys nudge a focused table."
          : "Select a table to see its status and open its order."}
      </p>

      {/* Canvas */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div
          ref={canvasRef}
          className="relative h-130"
          style={{
            backgroundImage:
              "radial-gradient(var(--border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {landmarks[zone].map((l) => (
            <div
              key={l.label}
              className={cn(
                "absolute flex items-center justify-center border border-dashed bg-muted/60 text-xs text-muted-foreground",
                l.className,
              )}
            >
              {l.label}
            </div>
          ))}

          {zoneTables.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No tables in this area yet.
            </p>
          )}

          {zoneTables.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Table ${t.number}, ${STATUS_LABEL[t.status].toLowerCase()}, ${t.seats} seats`}
              onClick={() => !editMode && openDetails(t)}
              onPointerDown={(e) => onPointerDown(e, t)}
              onPointerMove={(e) => onPointerMove(e, t)}
              onPointerUp={(e) => onPointerUp(e, t)}
              onKeyDown={(e) => onKeyDown(e, t)}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
                ...tableBox(t),
              }}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-0.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                t.shape === "round" ? "rounded-full" : "rounded-xl",
                tableStyle[t.status],
                editMode && "cursor-grab touch-none active:cursor-grabbing",
                sheetOpen && selectedId === t.id && "ring-2 ring-ring",
              )}
            >
              <span className="text-sm font-semibold tabular-nums">
                {t.number}
              </span>
              <span className="text-xs tabular-nums opacity-80">
                {t.status === "occupied"
                  ? `${t.guests}/${t.seats}`
                  : `${t.seats} seats`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Status sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
        >
          {selected && (
            <>
              <SheetHeader className="border-b p-4 pr-12">
                <SheetTitle className="flex items-center gap-2">
                  Table {selected.number}
                  <Badge
                    className={cn(
                      "rounded-full font-normal",
                      statusBadge[selected.status],
                    )}
                  >
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selected.zone} · {selected.seats} seats
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={selected.status === s ? "default" : "outline"}
                        aria-pressed={selected.status === s}
                        onClick={() => setStatus(selected.id, s)}
                      >
                        {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                {selected.status === "occupied" && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Guests seated</div>
                    <div className="flex items-center justify-between rounded-md border p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={selected.guests <= 1}
                        aria-label="Remove one guest"
                        onClick={() =>
                          updateTable(selected.id, {
                            guests: selected.guests - 1,
                          })
                        }
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="text-sm tabular-nums">
                        {selected.guests} of {selected.seats}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={selected.guests >= selected.seats}
                        aria-label="Add one guest"
                        onClick={() =>
                          updateTable(selected.id, {
                            guests: selected.guests + 1,
                          })
                        }
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <SheetFooter className="border-t p-4">
                <Button
                  nativeButton={false}
                  render={<Link href={`/order?table=${selected.number}`} />}
                >
                  Open order for table {selected.number}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing ? `Edit table ${editing.number}` : "Add table"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes apply to the floor plan right away."
                : "The new table appears in the current area. Drag it into place."}
            </DialogDescription>
          </DialogHeader>
          <TableForm
            key={formKey}
            table={editing}
            defaultZone={zone}
            nextNumber={nextNumber}
            onSubmit={handleSave}
            onRemove={handleRemove}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
