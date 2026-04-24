export type UserRole = "cashier" | "store_admin" | "owner";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  store_id: number | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Store {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export type ShiftStatus = "open" | "closed";

export interface Shift {
  id: number;
  store_id: number;
  cashier_id: number;
  opened_at: string;
  closed_at: string | null;
  starting_cash: string;
  status: ShiftStatus;
}

export type TransactionType = "sale" | "deposit" | "withdrawal";

export interface Transaction {
  id: number;
  shift_id: number;
  store_id: number;
  user_id: number;
  type: TransactionType;
  amount: string;
  payment_method_id: number | null;
  comment: string | null;
  created_at: string;
}
