import { useState } from "react";

import { cn } from "@/lib/utils";
import { useFloor } from "@/stores/FloorStore";
import {
  FloorTable,
  TableInput,
  TableShape,
  Zone,
  FormState,
  FormErrors,
} from "@/types/Floor";

import FieldComponent from "@/components/floor/FieldComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

export default function TableFormComponent({
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
  const { tables, zones } = useFloor();

  const shapeOptions: { value: TableShape; label: string }[] = [
    { value: "round", label: "Round" },
    { value: "square", label: "Square" },
    { value: "rect", label: "Rectangle" },
  ];

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
        <FieldComponent id="number" label="Table number" error={errors.number}>
          <Input
            id="number"
            type="number"
            min="1"
            value={form.number}
            aria-invalid={!!errors.number}
            onChange={(e) => set("number", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="seats" label="Seats" error={errors.seats}>
          <Input
            id="seats"
            type="number"
            min="1"
            max="12"
            value={form.seats}
            aria-invalid={!!errors.seats}
            onChange={(e) => set("seats", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="shape" label="Shape">
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
        </FieldComponent>
        <FieldComponent id="zone" label="Area">
          <Select
            value={form.zone}
            onValueChange={(v) => set("zone", v ?? defaultZone)}
          >
            <SelectTrigger id="zone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldComponent>
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
