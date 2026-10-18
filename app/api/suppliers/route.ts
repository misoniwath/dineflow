import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { suppliers } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { eq } from "drizzle-orm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return Boolean(payload);
}

// GET /api/suppliers - List all suppliers
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const allSuppliers = await db.select().from(suppliers);
    return NextResponse.json({ success: true, suppliers: allSuppliers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Supplier name is required" },
        { status: 400 },
      );
    }

    const [newSupplier] = await db
      .insert(suppliers)
      .values({ name, email, phone })
      .returning();

    return NextResponse.json({ success: true, supplier: newSupplier });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create supplier" },
      { status: 500 },
    );
  }
}

// PUT /api/suppliers - Update an existing supplier
export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "Supplier ID and name are required" },
        { status: 400 },
      );
    }

    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ name })
      .where(eq(suppliers.id, id))
      .returning();

    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, supplier: updatedSupplier });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update supplier" },
      { status: 500 },
    );
  }
}

// DELETE /api/suppliers?id=[supplierId] - Delete a supplier
export async function DELETE(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Supplier ID is required" },
        { status: 400 },
      );
    }

    await db.delete(suppliers).where(eq(suppliers.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete supplier" },
      { status: 500 },
    );
  }
}
