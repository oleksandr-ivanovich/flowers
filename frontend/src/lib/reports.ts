export interface PaymentBreakdownItem {
  payment_method_id: number | null;
  name: string;
  amount: string;
}

export interface ShiftReport {
  shift_id: number;
  store_id: number;
  store_name: string;
  cashier_id: number;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  starting_cash: string;
  sales_total: string;
  sales_by_payment: PaymentBreakdownItem[];
  deposits_total: string;
  withdrawals_total: string;
  cash_in_register: string;
  operations_count: number;
}

export interface StoreReport {
  store_id: number;
  store_name: string;
  date_from: string | null;
  date_to: string | null;
  sales_total: string;
  sales_by_payment: PaymentBreakdownItem[];
  deposits_total: string;
  withdrawals_total: string;
  shifts_count: number;
  operations_count: number;
}

export interface StoreSummary {
  store_id: number;
  store_name: string;
  sales_total: string;
  deposits_total: string;
  withdrawals_total: string;
  operations_count: number;
}

export interface NetworkReport {
  date_from: string | null;
  date_to: string | null;
  sales_total: string;
  sales_by_payment: PaymentBreakdownItem[];
  deposits_total: string;
  withdrawals_total: string;
  stores: StoreSummary[];
  operations_count: number;
}

export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function downloadExport(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("export failed");
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
