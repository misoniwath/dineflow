import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { floorTables } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth/jwt";

export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Support either a direct array payload or an object containing a tables array
    const tablesToUpdate = Array.isArray(body) ? body : body.tables;

    if (!Array.isArray(tablesToUpdate) || tablesToUpdate.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body: expected an array of tables",
        },
        { status: 400 },
      );
    }

    // Execute updates atomically within a transaction
    const updatedTables = await db.transaction(async (tx) => {
      const results = [];

      for (const item of tablesToUpdate) {
        const { id, ...patch } = item;
        if (!id) continue;

        const updateData: Record<string, any> = {
          updatedAt: sql`NOW()`,
        };

        if (patch.number !== undefined)
          updateData.number = Number(patch.number);
        if (patch.seats !== undefined) updateData.seats = Number(patch.seats);
        if (patch.shape !== undefined) updateData.shape = patch.shape;
        if (patch.zone !== undefined) updateData.zone = patch.zone;
        if (patch.x !== undefined) updateData.x = Number(patch.x);
        if (patch.y !== undefined) updateData.y = Number(patch.y);
        if (patch.status !== undefined) updateData.status = patch.status;
        if (patch.guests !== undefined)
          updateData.guests = Number(patch.guests);

        const [updated] = await tx
          .update(floorTables)
          .set(updateData)
          .where(eq(floorTables.id, id))
          .returning();

        if (updated) {
          results.push(updated);
        }
      }

      return results;
    });

    return NextResponse.json({ success: true, tables: updatedTables });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to bulk update floor tables",
      },
      { status: 500 },
    );
  }
}
