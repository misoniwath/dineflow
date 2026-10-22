import { NextResponse } from "next/server";
import {
  requireSchedulingManager,
  SchedulingAccessError,
} from "@/lib/auth/scheduling";
import { createStaffShift, SchedulingError } from "@/lib/db/scheduling";

export async function POST(request: Request) {
  try {
    await requireSchedulingManager();
    const body: unknown = await request.json().catch(() => null);
    const shift = await createStaffShift(body);
    return NextResponse.json({ shift }, { status: 201 });
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
    console.error("Failed to create shift", error);
    return NextResponse.json(
      { message: "Failed to create shift" },
      { status: 500 },
    );
  }
}
