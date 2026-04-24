import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiPost } from "@/lib/api";
import type { Transaction, TransactionType } from "@/lib/types";

import { Numpad } from "./Numpad";

interface Props {
  type: Exclude<TransactionType, "sale">;
  title: string;
  commentLabel: string;
}

export default function CashMovementPage({ type, title, commentLabel }: Props) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      apiPost<Transaction>("/api/transactions", {
        type,
        amount: Number(amount),
        comment: comment || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      nav("/");
    },
  });

  const canSubmit = Number(amount) > 0 && !submit.isPending;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
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
        <label className="mb-2 block text-sm font-medium text-gray-700">{commentLabel}</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none"
        />
      </div>

      {submit.isError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Не вдалось зберегти
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => submit.mutate()}
        className="w-full rounded-2xl bg-gray-900 py-5 text-xl font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
      >
        {submit.isPending ? "Зберігаємо…" : "Зберегти"}
      </button>
    </div>
  );
}
