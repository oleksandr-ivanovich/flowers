import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [adjustOpenId, setAdjustOpenId] = useState<number | null>(null);

  const customers = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      apiGet<Customer[]>(
        `/api/customers${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`,
      ),
  });

  const create = useMutation({
    mutationFn: () => apiPost<Customer>("/api/customers", { name, phone }),
    onSuccess: () => {
      setName("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: (c: Customer) =>
      apiPatch<Customer>(`/api/customers/${c.id}`, { is_active: !c.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Клієнти</h1>
        <Link to="/owner" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
          Назад
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && phone.trim()) create.mutate();
          }}
          className="space-y-3 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900">Новий клієнт</h2>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Імʼя"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
          />
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Телефон (наприклад +380501234567)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={create.isPending || !name.trim() || !phone.trim()}
            className="w-full rounded-lg bg-gray-900 py-3 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {create.isPending ? "Створюємо…" : "Створити клієнта"}
          </button>
          {create.isError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Не вдалось створити (можливо, телефон уже існує).
            </div>
          )}
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Існуючі клієнти</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за іменем або телефоном"
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          {customers.isLoading ? (
            <div className="text-sm text-gray-500">Завантаження…</div>
          ) : (customers.data ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">Нічого не знайдено</div>
          ) : (
            <ul className="divide-y">
              {(customers.data ?? []).map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">
                        {c.name}
                        {!c.is_active && (
                          <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                            неактивний
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.phone} · бонусів: <span className="font-semibold text-gray-900">{c.bonus_balance}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustOpenId(adjustOpenId === c.id ? null : c.id)}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
                      >
                        Скоригувати бонуси
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive.mutate(c)}
                        disabled={toggleActive.isPending}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                      >
                        {c.is_active ? "Деактивувати" : "Активувати"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Видалити клієнта "${c.name}"? Це незворотньо. У звітах історія залишиться, але без імені.`,
                            )
                          ) {
                            remove.mutate(c.id);
                          }
                        }}
                        disabled={remove.isPending}
                        className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                  {adjustOpenId === c.id && (
                    <AdjustBonusForm
                      customer={c}
                      onClose={() => setAdjustOpenId(null)}
                      onDone={() => qc.invalidateQueries({ queryKey: ["customers"] })}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function AdjustBonusForm({
  customer,
  onClose,
  onDone,
}: {
  customer: Customer;
  onClose: () => void;
  onDone: () => void;
}) {
  const [delta, setDelta] = useState("");
  const [comment, setComment] = useState("");

  const adjust = useMutation({
    mutationFn: () =>
      apiPost<Customer>(`/api/customers/${customer.id}/adjust`, {
        delta: Number(delta.replace(",", ".")),
        comment: comment || null,
      }),
    onSuccess: () => {
      setDelta("");
      setComment("");
      onDone();
      onClose();
    },
  });

  const num = Number(delta.replace(",", "."));
  const canSubmit = Number.isFinite(num) && num !== 0 && !adjust.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) adjust.mutate();
      }}
      className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3"
    >
      <div className="text-xs text-gray-600">
        Введіть позитивне число для нарахування (наприклад <code>50</code>) або негативне для списання (<code>-30</code>).
      </div>
      <div className="flex gap-2">
        <input
          required
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="Дельта (грн)"
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Коментар"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Застосувати
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
        >
          Скасувати
        </button>
      </div>
      {adjust.isError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Не вдалось скоригувати (баланс не може стати від'ємним).
        </div>
      )}
    </form>
  );
}
