import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/jwt";
import {
  BillingError,
  parsePaymentInput,
  recordBillPayment,
} from "@/lib/db/billing";

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const input = parsePaymentInput(await request.json().catch(() => null));
    return NextResponse.json({ bill: await recordBillPayment(input) });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("Failed to record payment", error);
    return NextResponse.json(
      { message: "Failed to record payment" },
      { status: 500 },
    );
  }
}
