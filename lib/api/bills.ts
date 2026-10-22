import type { Bill, RecordBillPaymentInput } from "@/types/Bill";

async function readResponse(response: Response) {
  if (response.redirected)
    throw new Error("Please sign in again to use Billing.");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load billing data");
  }
  return data;
}

export async function getBillsApi(): Promise<Bill[]> {
  const response = await fetch("/api/bills", { cache: "no-store" });
  return (await readResponse(response)).bills;
}

export async function recordBillPaymentApi(
  input: RecordBillPaymentInput,
): Promise<Bill> {
  const response = await fetch("/api/bills/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readResponse(response)).bill;
}
