import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Shift } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function CashierHome() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const shiftQuery = useQuery({
    queryKey: ["shifts", "me", "current"],
    queryFn: () => apiGet<Shift | null>("/api/shifts/me/current"),
  });

  const openMutation = useMutation({
    mutationFn: (starting_cash: number) =>
      apiPost<Shift>("/api/shifts/open", { starting_cash }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts", "me", "current"] }),
  });

  const onOpenShift = () => {
    const raw = window.prompt("Стартова сума в касі (грн):", "0");
    if (raw === null) return;
    const amount = Number(raw.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      alert("Некоректна сума");
      return;
    }
    openMutation.mutate(amount);
  };

  if (!user) return null;
  const shift = shiftQuery.data;

  return (
    <div className="space-y-4">
      {shiftQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm text-gray-500">Завантаження…</div>
      ) : shift ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Відкрита зміна</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                з {formatTime(shift.opened_at)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Стартова сума: {shift.starting_cash} грн
              </div>
            </div>
            <Link
              to="/shift/close"
              className="rounded-lg border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
            >
              Закрити зміну
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              to="/sale"
              className="rounded-2xl bg-gray-900 px-6 py-8 text-center text-lg font-semibold text-white hover:bg-gray-800"
            >
              Додати продаж
            </Link>
            <Link
              to="/deposit"
              className="rounded-2xl border-2 border-gray-900 px-6 py-8 text-center text-lg font-semibold text-gray-900 hover:bg-gray-100"
            >
              Внесення
            </Link>
            <Link
              to="/withdrawal"
              className="rounded-2xl border-2 border-gray-900 px-6 py-8 text-center text-lg font-semibold text-gray-900 hover:bg-gray-100"
            >
              Вилучення
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-medium text-gray-900">Зміна не відкрита</h2>
          <p className="mt-1 text-sm text-gray-600">
            Щоб розпочати роботу, відкрийте зміну.
          </p>
          <button
            onClick={onOpenShift}
            disabled={openMutation.isPending}
            className="mt-4 rounded-lg bg-gray-900 px-6 py-3 text-lg font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {openMutation.isPending ? "Відкриваємо…" : "Відкрити зміну"}
          </button>
          {openMutation.isError && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Не вдалось відкрити зміну
            </div>
          )}
        </div>
      )}
    </div>
  );
}
