import { Supplier } from "@/types/Supplier";

export async function getSuppliersApi(): Promise<Supplier[]> {
  const res = await fetch("/api/suppliers", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch suppliers");
  }

  const data = await res.json();
  return data.suppliers || [];
}

export async function saveSupplierApi(
  supplier: Partial<Supplier>,
): Promise<Supplier> {
  const isUpdate = Boolean(supplier.id);
  const method = isUpdate ? "PUT" : "POST";

  const res = await fetch("/api/suppliers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(supplier),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save supplier");
  }

  const data = await res.json();
  return data.supplier;
}

export async function deleteSupplierApi(id: string): Promise<void> {
  const res = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete supplier");
  }
}
