import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { floorTables } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth/jwt";

// GET /api/floor-plans - List all floor tables
export async function GET() {
  try {
    const allTables = await db.select().from(floorTables);
    return NextResponse.json({ success: true, tables: allTables });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch floor tables",
      },
      { status: 500 },
    );
  }
}

// POST /api/floor-plans - Create a new floor table
export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { number, seats, shape, zone, x, y, status, guests } = body;

    if (number === undefined || seats === undefined || !shape || !zone) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required table fields (number, seats, shape, zone)",
        },
        { status: 400 },
      );
    }

    const [newTable] = await db
      .insert(floorTables)
      .values({
        number: Number(number),
        seats: Number(seats),
        shape,
        zone,
        x: x !== undefined ? Number(x) : 20,
        y: y !== undefined ? Number(y) : 25,
        status: status || "free",
        guests: guests !== undefined ? Number(guests) : 0,
      })
      .returning();

    return NextResponse.json({ success: true, table: newTable });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create floor table",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Table ID is required for updates" },
        { status: 400 },
      );
    }

    // Build clean update object, converting numeric fields safely
    const updateData: Record<string, any> = {
      updatedAt: sql`NOW()`,
    };

    if (patch.number !== undefined) updateData.number = Number(patch.number);
    if (patch.seats !== undefined) updateData.seats = Number(patch.seats);
    if (patch.shape !== undefined) updateData.shape = patch.shape;
    if (patch.zone !== undefined) updateData.zone = patch.zone;
    if (patch.x !== undefined) updateData.x = Number(patch.x);
    if (patch.y !== undefined) updateData.y = Number(patch.y);
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.guests !== undefined) updateData.guests = Number(patch.guests);

    const [updatedTable] = await db
      .update(floorTables)
      .set(updateData)
      .where(eq(floorTables.id, id))
      .returning();

    if (!updatedTable) {
      return NextResponse.json(
        { success: false, error: "Floor table not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, table: updatedTable });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update floor table",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/floor-plans?id=[tableId] - Delete a floor table
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
        { success: false, error: "Table ID is required" },
        { status: 400 },
      );
    }

    await db.delete(floorTables).where(eq(floorTables.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete floor table",
      },
      { status: 500 },
    );
  }
}
