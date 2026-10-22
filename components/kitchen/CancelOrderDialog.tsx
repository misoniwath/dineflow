"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KitchenTicket } from "@/types/KitchenTicket";

export default function CancelOrderDialog({ ticket, onClose, onConfirm }: {
  ticket: KitchenTicket;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 500) {
      setError("Enter a cancellation reason of 1–500 characters.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel order.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending.current) onClose(); }}>
      <DialogContent showCloseButton={!saving} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel order for table {ticket.tableNumber}?</DialogTitle>
          <DialogDescription>
            These items will be removed from the unpaid bill and unused ingredients returned to stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4" aria-busy={saving}>
          <ul className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            {ticket.items.map((item) => <li key={item.id}>{item.quantity}× {item.name}</li>)}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="order-cancel-reason">Cancellation reason</Label>
            <Textarea
              id="order-cancel-reason"
              required maxLength={500} disabled={saving}
              value={reason}
              placeholder="For example: duplicate order or customer cancelled."
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "order-cancel-error" : undefined}
              onChange={(event) => { setReason(event.target.value); setError(null); }}
            />
          </div>
          {error && <p id="order-cancel-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Keep order</Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
