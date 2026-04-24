import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import type { Store } from "@/lib/types";

export default function StoresPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiGet<Store[]>("/api/stores"),
  });

  const createStore = useMutation({
    mutationFn: () => apiPost<Store>("/api/stores", { name, address: address || null }),
    onSuccess: () => {
      setName("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["stores"] });
    },
  });

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Магазини</h1>
        <Link to="/owner" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
          Назад
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createStore.mutate();
          }}
          className="space-y-3 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900">Новий магазин</h2>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Назва"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адреса"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={createStore.isPending || !name.trim()}
            className="w-full rounded-lg bg-gray-900 py-3 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            Створити магазин
          </button>
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-medium text-gray-900">Існуючі магазини</h2>
          {stores.isLoading ? (
            <div className="text-sm text-gray-500">Завантаження…</div>
          ) : (stores.data ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">Ще немає магазинів</div>
          ) : (
            <ul className="divide-y">
              {(stores.data ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {s.name}
                      {!s.is_active && (
                        <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                          неактивний
                        </span>
                      )}
                    </div>
                    {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                  </div>
                  <Link
                    to={`/owner/store/${s.id}/report`}
                    className="text-sm text-gray-700 underline"
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
