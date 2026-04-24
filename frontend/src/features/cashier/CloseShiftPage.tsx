import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import { downloadExport, formatMoney, type ShiftReport } from "@/lib/reports";
import type { Shift } from "@/lib/types";

export default function CloseShiftPage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const shiftQuery = useQuery({
    queryKey: ["shifts", "me", "current"],
    queryFn: () => apiGet<Shift | null>("/api/shifts/me/current"),
  });

  const report = useQuery({
    queryKey: ["reports", "shift", shiftQuery.data?.id],
    queryFn: () => apiGet<ShiftReport>(`/api/reports/shift/${shiftQuery.data!.id}`),
    enabled: !!shiftQuery.data,
  });

  const closeMutation = useMutation({
    mutationFn: () => apiPost(`/api/shifts/${shiftQuery.data!.id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      nav("/");
    },
  });

  if (shiftQuery.isLoading || report.isLoading) {
    return <div className="p-6 text-gray-500">Завантаження…</div>;
  }

  if (!shiftQuery.data) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Немає відкритої зміни</h1>
        <Link to="/" className="inline-block rounded-lg border px-4 py-2">
          На головну
        </Link>
      </div>
    );
  }

  const r = report.data;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Закриття зміни</h1>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          Скасувати
        </Link>
      </div>

      {r && (
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <div className="border-b pb-3 text-sm text-gray-600">
            <div>Магазин: <span className="font-medium text-gray-900">{r.store_name}</span></div>
            <div>Касир: <span className="font-medium text-gray-900">{r.cashier_name}</span></div>
            <div>Стартова сума: {formatMoney(r.starting_cash)} грн</div>
          </div>

          <Row label="Продажі (всього)" value={r.sales_total} bold />
          {r.sales_by_payment.map((p) => (
            <Row key={p.payment_method_id ?? p.name} label={`  ${p.name}`} value={p.amount} muted />
          ))}
          <Row label="Внесення" value={r.deposits_total} />
          <Row label="Вилучення" value={r.withdrawals_total} />
          <div className="border-t pt-3">
            <Row label="Готівка в касі" value={r.cash_in_register} bold />
          </div>
          <div className="text-sm text-gray-500">Операцій: {r.operations_count}</div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() =>
                downloadExport(
                  `/api/reports/shift/${r.shift_id}/export?format=xlsx`,
                  `shift-${r.shift_id}.xlsx`,
                )
              }
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm hover:bg-gray-100"
            >
              Експорт XLSX
            </button>
            <button
              onClick={() =>
                downloadExport(
                  `/api/reports/shift/${r.shift_id}/export?format=csv`,
                  `shift-${r.shift_id}.csv`,
                )
              }
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm hover:bg-gray-100"
            >
              Експорт CSV
            </button>
          </div>
        </div>
      )}

      <button
        disabled={closeMutation.isPending}
        onClick={() => closeMutation.mutate()}
        className="w-full rounded-2xl bg-red-600 py-5 text-xl font-semibold text-white hover:bg-red-700 disabled:opacity-40"
      >
        {closeMutation.isPending ? "Закриваємо…" : "Закрити зміну"}
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${
        muted ? "text-gray-600" : "text-gray-900"
      }`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-semibold" : ""}`}>
        {formatMoney(value)} грн
      </span>
    </div>
  );
}
