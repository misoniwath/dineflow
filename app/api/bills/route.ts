import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/jwt";
import { listBills } from "@/lib/db/billing";

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ bills: await listBills() });
  } catch (error) {
    console.error("Failed to load bills", error);
    return NextResponse.json(
      { message: "Failed to load bills" },
      { status: 500 },
    );
  }
}
