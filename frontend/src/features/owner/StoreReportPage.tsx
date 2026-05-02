import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiGet } from "@/lib/api";
import { downloadExport, formatMoney, type StoreReport } from "@/lib/reports";

import { DateRangePicker, dateRangeParams } from "./DateRangePicker";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StoreReportPage() {
  const { id } = useParams<{ id: string }>();
  const storeId = Number(id);
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const qs = dateRangeParams(dateFrom, dateTo);

  const report = useQuery({
    queryKey: ["reports", "store", storeId, dateFrom, dateTo],
    queryFn: () => apiGet<StoreReport>(`/api/reports/store/${storeId}${qs}`),
    enabled: Number.isFinite(storeId),
  });

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Звіт по магазину</h1>
        <Link to="/owner" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
          Назад
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(r) => {
              setDateFrom(r.dateFrom);
              setDateTo(r.dateTo);
            }}
          />
        </div>

        {report.isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-gray-500">Завантаження…</div>
        ) : report.data ? (
          <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">{report.data.store_name}</h2>
            <Row label="Продажі (всього)" value={report.data.sales_total} bold />
            {report.data.sales_by_payment.map((p) => (
              <Row key={p.payment_method_id ?? p.name} label={`  ${p.name}`} value={p.amount} muted />
            ))}
            <Row label="Внесення" value={report.data.deposits_total} />
            <Row label="Вилучення" value={report.data.withdrawals_total} />
            <div className="text-sm text-gray-500">
              Кількість змін: {report.data.shifts_count} · операцій: {report.data.operations_count}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() =>
                  downloadExport(
                    `/api/reports/store/${storeId}/export?format=xlsx&${qs.slice(1)}`,
                    `store-${storeId}.xlsx`,
                  )
                }
                className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
              >
                Експорт XLSX
              </button>
              <button
                onClick={() =>
                  downloadExport(
                    `/api/reports/store/${storeId}/export?format=csv&${qs.slice(1)}`,
                    `store-${storeId}.csv`,
                  )
                }
                className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
              >
                Експорт CSV
              </button>
            </div>
          </div>
        ) : null}
      </main>
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
    <div className={`flex items-baseline justify-between ${muted ? "text-gray-600" : "text-gray-900"}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-semibold" : ""}`}>
        {formatMoney(value)} €
      </span>
    </div>
  );
}
