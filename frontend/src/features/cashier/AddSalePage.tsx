import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import type { Customer, PaymentMethod, Transaction } from "@/lib/types";

import { Numpad } from "./Numpad";

export default function AddSalePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [pmId, setPmId] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const pmQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiGet<PaymentMethod[]>("/api/payment-methods"),
  });

  const customerSearch = useQuery({
    queryKey: ["customers", "search", debouncedSearch],
    queryFn: () =>
      apiGet<Customer[]>(
        `/api/customers${debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : "?limit=10"}`,
      ),
    enabled: customer === null,
  });

  const selectedPm = useMemo(
    () => (pmQuery.data ?? []).find((pm) => pm.id === pmId) ?? null,
    [pmQuery.data, pmId],
  );

  const isBonusPayment = !!selectedPm?.is_bonus;
  const num = Number(amount);
  const customerBalance = customer ? Number(customer.bonus_balance) : 0;
  const insufficientBonus =
    isBonusPayment && customer !== null && num > 0 && num > customerBalance;
  const bonusNeedsCustomer = isBonusPayment && customer === null;

  const createSale = useMutation({
    mutationFn: () =>
      apiPost<Transaction>("/api/transactions", {
        type: "sale",
        amount: Number(amount),
        payment_method_id: pmId,
        customer_id: customer?.id ?? null,
        comment: comment || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      nav("/");
    },
  });

  const canSubmit =
    num > 0 &&
    pmId !== null &&
    !bonusNeedsCustomer &&
    !insufficientBonus &&
    !createSale.isPending;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Продаж</h1>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          Скасувати
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 text-center text-4xl font-bold text-gray-900 tabular-nums">
          {amount || "0"} <span className="text-2xl font-normal text-gray-500">грн</span>
        </div>
        <Numpad value={amount} onChange={setAmount} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Клієнт (необовʼязково)
        </label>
        {customer ? (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{customer.name}</div>
              <div className="text-xs text-gray-600">
                {customer.phone} · бонусів:{" "}
                <span className="font-semibold text-gray-900">{customer.bonus_balance}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
                setSearch("");
              }}
              className="ml-2 rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
              aria-label="Очистити клієнта"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за іменем або телефоном"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-gray-900 focus:outline-none"
            />
            {(customerSearch.data ?? []).length > 0 && (
              <ul className="mt-2 max-h-56 divide-y overflow-auto rounded-lg border border-gray-200">
                {(customerSearch.data ?? []).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomer(c);
                        setSearch("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900 truncate">{c.name}</span>
                        <span className="block text-xs text-gray-500">{c.phone}</span>
                      </span>
                      <span className="ml-2 text-xs text-gray-700">
                        бонусів: <span className="font-semibold">{c.bonus_balance}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {debouncedSearch && (customerSearch.data ?? []).length === 0 && !customerSearch.isLoading && (
              <div className="mt-2 text-xs text-gray-500">Нічого не знайдено</div>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Вид оплати</label>
        <div className="grid grid-cols-2 gap-2">
          {(pmQuery.data ?? []).map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() => setPmId(pm.id)}
              className={`rounded-xl px-4 py-4 text-base font-medium ${
                pmId === pm.id
                  ? "bg-gray-900 text-white"
                  : "border-2 border-gray-200 text-gray-900 hover:border-gray-400"
              }`}
            >
              {pm.name}
            </button>
          ))}
        </div>
        {bonusNeedsCustomer && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Оберіть клієнта для оплати бонусами.
          </div>
        )}
        {insufficientBonus && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Недостатньо бонусів: {customer?.bonus_balance} грн.
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Коментар (необовʼязково)
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
        />
      </div>

      {createSale.isError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Не вдалось зберегти продаж
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => createSale.mutate()}
        className="w-full rounded-2xl bg-gray-900 py-5 text-xl font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
      >
        {createSale.isPending ? "Зберігаємо…" : "Зберегти продаж"}
      </button>
    </div>
  );
}
