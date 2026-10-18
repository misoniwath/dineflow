import { Reservation, ReservationInput } from "@/types/Reservation";

export async function getReservationsApi(): Promise<Reservation[]> {
  const res = await fetch("/api/reservations", { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch reservations");
  const data = await res.json();
  return data.reservations || [];
}

export async function addReservationApi(
  input: ReservationInput,
): Promise<Reservation> {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create reservation");
  const data = await res.json();
  return data.reservation;
}

export async function updateReservationApi(
  patch: Partial<Reservation>,
): Promise<Reservation> {
  const res = await fetch("/api/reservations", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...patch }),
  });
  if (!res.ok) throw new Error("Failed to update reservation");
  const data = await res.json();
  return data.reservation;
}

export async function deleteReservationApi(id: string): Promise<void> {
  const res = await fetch(`/api/reservations?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete reservation");
}
