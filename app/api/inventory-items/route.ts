import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { inventoryItems } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const items = await db
      .select()
      .from(inventoryItems)
      .orderBy(desc(inventoryItems.createdAt));
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch inventory",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, unit, onHand, par, lowAt, expires, supplierId } = body;

    const [item] = await db
      .insert(inventoryItems)
      .values({
        name,
        unit,
        onHand: Number(onHand),
        par: Number(par),
        lowAt: Number(lowAt),
        expires: expires || null,
        supplierId,
      })
      .onConflictDoUpdate({
        target: inventoryItems.id,
        set: {
          name,
          unit,
          onHand: Number(onHand),
          par: Number(par),
          lowAt: Number(lowAt),
          expires: expires || null,
          supplierId,
        },
      })
      .returning();

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save inventory item",
      },
      { status: 500 },
    );
  }
}

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
        { success: false, message: "Item ID is required" },
        { status: 400 },
      );
    }

    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete inventory item",
      },
      { status: 500 },
    );
  }
}
