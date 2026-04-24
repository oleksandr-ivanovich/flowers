import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
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

  const toggleActive = useMutation({
    mutationFn: (s: Store) =>
      apiPatch<Store>(`/api/stores/${s.id}`, { is_active: !s.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });

  const deleteStore = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/stores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
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
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
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
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/owner/store/${s.id}/report`}
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
                    >
                      Звіт
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleActive.mutate(s)}
                      disabled={toggleActive.isPending}
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                    >
                      {s.is_active ? "Деактивувати" : "Активувати"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Видалити магазин "${s.name}" разом з усіма змінами й транзакціями? Це незворотньо.`,
                          )
                        ) {
                          deleteStore.mutate(s.id);
                        }
                      }}
                      disabled={deleteStore.isPending}
                      className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                    >
                      Видалити
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
