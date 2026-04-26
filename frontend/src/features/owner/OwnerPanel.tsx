import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Store } from "@/lib/types";

export default function OwnerPanel() {
  const { user, logout } = useAuth();
  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiGet<Store[]>("/api/stores"),
  });

  if (!user) return null;
  const isOwner = user.role === "owner";

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Панель власника</h1>
          <p className="text-sm text-gray-600">{user.full_name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
            На головну
          </Link>
          <button onClick={() => void logout()} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
            Вийти
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {isOwner && (
          <>
            <Link to="/owner/stores" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
              <h2 className="font-semibold text-gray-900">Магазини</h2>
              <p className="mt-1 text-sm text-gray-600">Створення та керування магазинами</p>
            </Link>
            <Link to="/owner/customers" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
              <h2 className="font-semibold text-gray-900">Клієнти</h2>
              <p className="mt-1 text-sm text-gray-600">База клієнтів і бонусні баланси</p>
            </Link>
            <Link to="/owner/network-report" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
              <h2 className="font-semibold text-gray-900">Зведений звіт по мережі</h2>
              <p className="mt-1 text-sm text-gray-600">Усі магазини, період на вибір</p>
            </Link>
          </>
        )}
        <Link to="/owner/users" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
          <h2 className="font-semibold text-gray-900">Користувачі</h2>
          <p className="mt-1 text-sm text-gray-600">Касири, адміни, доступи</p>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900">Звіти по магазинах</h2>
          {stores.isLoading ? (
            <div className="text-sm text-gray-500">Завантаження…</div>
          ) : (stores.data ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">Магазинів ще немає</div>
          ) : (
            <ul className="divide-y">
              {(stores.data ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                  </div>
                  <Link
                    to={`/owner/store/${s.id}/report`}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
                  >
                    Звіт
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
