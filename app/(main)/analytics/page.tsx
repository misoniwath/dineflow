import { connection } from "next/server";
import AnalyticsView from "@/views/AnalyticsView";

export default async function AnalyticsPage() {
  await connection();
  return <AnalyticsView initialNow={new Date().toISOString()} />;
}
