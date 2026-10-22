import { NextResponse } from "next/server";
import {
  requireSchedulingUser,
  SchedulingAccessError,
} from "@/lib/auth/scheduling";
import { recordStaffAttendance, SchedulingError } from "@/lib/db/scheduling";

export async function POST(request: Request) {
  try {
    const user = await requireSchedulingUser();
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new SchedulingError("An attendance action is required.");
    }
    if ("staffId" in body && body.staffId !== user.id) {
      throw new SchedulingAccessError(
        403,
        "You can only record your own attendance.",
      );
    }
    const entry = await recordStaffAttendance({ ...body, staffId: user.id });
    return NextResponse.json(
      { entry },
      { status: entry.clockedOutAt === null ? 201 : 200 },
    );
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
    console.error("Failed to record attendance", error);
    return NextResponse.json(
      { message: "Failed to record attendance" },
      { status: 500 },
    );
  }
}
