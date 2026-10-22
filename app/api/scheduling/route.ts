import { NextResponse } from "next/server";
import {
  requireSchedulingUser,
  SchedulingAccessError,
} from "@/lib/auth/scheduling";
import { getStaffSchedule, SchedulingError } from "@/lib/db/scheduling";

export async function GET(request: Request) {
  try {
    const user = await requireSchedulingUser();
    const weekStart = new URL(request.url).searchParams.get("weekStart");
    const data = await getStaffSchedule(weekStart, { id: user.id, role: user.role });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof SchedulingAccessError ||
      error instanceof SchedulingError
    ) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("Failed to load scheduling", error);
    return NextResponse.json(
      { message: "Failed to load scheduling" },
      { status: 500 },
    );
  }
}
