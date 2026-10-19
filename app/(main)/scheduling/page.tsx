import { connection } from "next/server";
import SchedulingView from "@/views/SchedulingView";

export default async function SchedulingPage() {
  // Use request time so the initial week stays current and hydrates consistently.
  await connection();
  return <SchedulingView initialNow={new Date().toISOString()} />;
}
