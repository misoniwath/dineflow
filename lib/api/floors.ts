import { FloorTable, TableInput, TableStatus, Zone } from "@/types/Floor";

function formatSnakeCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function mapFloorTable(table: FloorTable): FloorTable {
  return {
    ...table,
    zone: formatSnakeCase(table.zone.trim()) as Zone,
    shape: table.shape.trim() as FloorTable["shape"],
  };
}

function toSnakeCase(str: string | null | undefined): string {
  if (!str || typeof str !== "string") return "";

  return str
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/[\s\-_.]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
}

export async function getFloorTables(): Promise<FloorTable[]> {
  const res = await fetch("/api/floor-plans", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch floor tables");
  }

  const data = await res.json();
  return data.tables.map(mapFloorTable);
}

export async function addFloorTable(
  input: TableInput & {
    status?: TableStatus;
    guests?: number;
    x?: number;
    y?: number;
  },
): Promise<FloorTable> {
  const res = await fetch("/api/floor-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, zone: toSnakeCase(input.zone) }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create floor table");
  }

  const data = await res.json();
  return mapFloorTable(data.table);
}

export async function updateFloorTable(
  input: Partial<TableInput> & {
    id?: string;
    status?: TableStatus;
    guests?: number;
    x?: number;
    y?: number;
  },
): Promise<FloorTable> {
  const res = await fetch("/api/floor-plans", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      zone: input.zone ? toSnakeCase(input.zone) : undefined,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update floor table");
  }

  const data = await res.json();
  return mapFloorTable(data.table);
}

export async function deleteFloorTable(id: string): Promise<void> {
  const res = await fetch(`/api/floor-plans?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete floor table");
  }
}
