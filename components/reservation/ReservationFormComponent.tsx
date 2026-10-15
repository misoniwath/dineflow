import { useState } from "react";
import {
  Reservation,
  FormState,
  FormErrors,
  ReservationInput,
} from "@/types/Reservation";

import FieldComponent from "@/components/reservation/FieldComponent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogClose } from "@/components/ui/dialog";

export default function ReservationFormComponent({
  reservation,
  defaultDate,
  onSubmit,
}: {
  reservation: Reservation | null;
  defaultDate: string;
  onSubmit: (input: ReservationInput) => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    name: reservation?.name ?? "",
    phone: reservation?.phone ?? "",
    party: String(reservation?.party ?? 2),
    date: reservation?.date ?? defaultDate,
    time: reservation?.time ?? "19:00",
    notes: reservation?.notes ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: any) {
    e.preventDefault();
    const party = Number(form.party);

    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Enter the guest's name.";
    if (!Number.isInteger(party) || party < 1 || party > 20)
      next.party = "Enter a party of 1 to 20.";
    if (!form.date) next.date = "Choose a date.";
    if (!form.time) next.time = "Choose a time.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      party,
      date: form.date,
      time: form.time,
      notes: form.notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FieldComponent
          id="name"
          label="Guest name"
          error={errors.name}
          className="col-span-2"
        >
          <Input
            id="name"
            placeholder="e.g. Dara Chhun"
            value={form.name}
            aria-invalid={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="party" label="Party size" error={errors.party}>
          <Input
            id="party"
            type="number"
            min="1"
            max="20"
            value={form.party}
            aria-invalid={!!errors.party}
            onChange={(e) => set("party", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="phone" label="Phone (optional)">
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="date" label="Date" error={errors.date}>
          <Input
            id="date"
            type="date"
            value={form.date}
            aria-invalid={!!errors.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent id="time" label="Time" error={errors.time}>
          <Input
            id="time"
            type="time"
            value={form.time}
            aria-invalid={!!errors.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </FieldComponent>
        <FieldComponent
          id="notes"
          label="Notes (optional)"
          className="col-span-2"
        >
          <Input
            id="notes"
            placeholder="Allergies, occasion, seating request"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </FieldComponent>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit">
          {reservation ? "Save changes" : "Add reservation"}
        </Button>
      </DialogFooter>
    </form>
  );
}
