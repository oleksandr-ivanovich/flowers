import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import type { PaymentMethod, Transaction } from "@/lib/types";

import { Numpad } from "./Numpad";

export default function AddSalePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [pmId, setPmId] = useState<number | null>(null);

  const pmQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiGet<PaymentMethod[]>("/api/payment-methods"),
  });

  const createSale = useMutation({
    mutationFn: () =>
      apiPost<Transaction>("/api/transactions", {
        type: "sale",
        amount: Number(amount),
        payment_method_id: pmId,
        comment: comment || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      nav("/");
    },
  });

  const canSubmit =
    Number(amount) > 0 && pmId !== null && !createSale.isPending;

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
