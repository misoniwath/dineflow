"use client";
import { useEffect, useState } from "react";
import { todayISO } from "@/stores/ReservationStore";

import ReservationsBoardComponent from "@/components/reservation/ReservationsBoardComponent";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ReservationsView() {
  // "Today" depends on the browser's clock, so render after mount to keep
  // server and client markup identical.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);

  if (!today) return <div className="min-h-96" aria-busy="true" />;
  return <ReservationsBoardComponent today={today} />;
}
