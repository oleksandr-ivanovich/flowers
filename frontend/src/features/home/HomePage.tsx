import { Link } from "react-router-dom";

import CashierHome from "@/features/cashier/CashierHome";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  cashier: "Касир",
  store_admin: "Адміністратор магазину",
  owner: "Власник",
};

export default function HomePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isCashier = user.role === "cashier" || user.role === "store_admin";

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Каса</h1>
          <p className="text-sm text-gray-600">
            {user.full_name} · {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === "owner" && (
            <Link
              to="/owner"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              Панель власника
            </Link>
          )}
          <button
            onClick={() => void logout()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
          >
            Вийти
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3">
        {isCashier ? (
          <CashierHome />
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-medium text-gray-900">Ласкаво просимо</h2>
            <p className="mt-1 text-sm text-gray-600">
              Відкрийте панель власника, щоб переглянути магазини та звіти.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
