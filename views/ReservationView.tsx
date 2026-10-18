"use client";
import { useEffect, useState } from "react";
import { todayISO, useReservations } from "@/stores/ReservationStore";

import ReservationsBoardComponent from "@/components/reservation/ReservationsBoardComponent";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ReservationsView() {
  const { loading: isReservationLoading } = useReservations();
  const [today, setToday] = useState<string | null>(null);

  const loading = !today || isReservationLoading;

  useEffect(() => setToday(todayISO()), []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading reservations...</span>
      </div>
    );
  }

  return <ReservationsBoardComponent today={today} />;
}
