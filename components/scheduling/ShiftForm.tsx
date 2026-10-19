"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getRestaurantDate,
  getRestaurantTimeInput,
  getShiftError,
  toRestaurantTimestamp,
} from "@/lib/scheduling";
import { uid } from "@/lib/utils";
import type { Shift, StaffMember } from "@/types/Scheduling";

export default function ShiftForm({
  shift,
  defaultStaffId,
  defaultDate,
  staff,
  shifts,
  onSave,
  onDelete,
  onCancel,
}: {
  shift: Shift | null;
  defaultStaffId: string;
  defaultDate: string;
  staff: StaffMember[];
  shifts: Shift[];
  onSave: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => ({
    staffId: shift?.staffId ?? defaultStaffId,
    startDate: shift ? getRestaurantDate(shift.startsAt) : defaultDate,
    startTime: shift ? getRestaurantTimeInput(shift.startsAt) : "11:00",
    endDate: shift ? getRestaurantDate(shift.endsAt) : defaultDate,
    endTime: shift ? getRestaurantTimeInput(shift.endsAt) : "19:00",
    notes: shift?.notes ?? "",
  }));
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let nextShift: Shift;
    try {
      nextShift = {
        id: shift?.id ?? uid(),
        staffId: form.staffId,
        startsAt: toRestaurantTimestamp(form.startDate, form.startTime),
        endsAt: toRestaurantTimestamp(form.endDate, form.endTime),
        notes: form.notes.trim(),
      };
    } catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      setError(cause.message);
      return;
    }
    const validationError = getShiftError(nextShift, shifts, staff);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(nextShift);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="shift-employee">Employee</Label>
        <select
          id="shift-employee"
          name="staffId"
          required
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          value={form.staffId}
          onChange={(event) => update("staffId", event.target.value)}
        >
          <option value="">Choose an employee</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} · {person.role}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {([
          ["startDate", "Start date", "date"],
          ["startTime", "Start time", "time"],
          ["endDate", "End date", "date"],
          ["endTime", "End time", "time"],
        ] as const).map(([field, label, type]) => (
          <div key={field} className="min-w-0 space-y-2">
            <Label htmlFor={`shift-${field}`}>{label}</Label>
            <Input
              id={`shift-${field}`}
              name={field}
              type={type}
              required
              className="h-10"
              value={form[field]}
              aria-describedby={error ? "shift-error" : undefined}
              aria-invalid={error !== null}
              onChange={(event) => update(field, event.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        For overnight shifts, set the end date to the next day.
      </p>

      <div className="space-y-2">
        <Label htmlFor="shift-notes">Notes (optional)</Label>
        <Textarea
          id="shift-notes"
          name="notes"
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Station, handover, or other shift details"
          rows={3}
        />
      </div>

      {error && (
        <p id="shift-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="m-0 flex-wrap rounded-lg border p-3">
        {shift && (
          <Button
            type="button"
            variant="destructive"
            className="sm:mr-auto"
            onClick={() => onDelete(shift.id)}
          >
            Delete shift
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{shift ? "Save changes" : "Add shift"}</Button>
      </DialogFooter>
    </form>
  );
}
