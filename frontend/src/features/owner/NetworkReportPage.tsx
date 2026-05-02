import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { apiGet } from "@/lib/api";
import { downloadExport, formatMoney, type NetworkReport } from "@/lib/reports";

import { DateRangePicker, dateRangeParams } from "./DateRangePicker";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NetworkReportPage() {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const qs = dateRangeParams(dateFrom, dateTo);

  const report = useQuery({
    queryKey: ["reports", "network", dateFrom, dateTo],
    queryFn: () => apiGet<NetworkReport>(`/api/reports/network${qs}`),
  });

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Зведений звіт по мережі</h1>
        <Link to="/owner" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
          Назад
        </Link>
      </header>

      <main className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
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
          <>
            <div className="space-y-2 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 font-semibold text-gray-900">Підсумок</h2>
              <Row label="Продажі (всього)" value={report.data.sales_total} bold />
              {report.data.sales_by_payment.map((p) => (
                <Row key={p.payment_method_id ?? p.name} label={`  ${p.name}`} value={p.amount} muted />
              ))}
              <Row label="Внесення" value={report.data.deposits_total} />
              <Row label="Вилучення" value={report.data.withdrawals_total} />
              <div className="pt-2 text-sm text-gray-500">
                Всього операцій: {report.data.operations_count}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">По магазинах</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="pb-2">Магазин</th>
                    <th className="pb-2 text-right">Продажі</th>
                    <th className="pb-2 text-right">Внесення</th>
                    <th className="pb-2 text-right">Вилучення</th>
                    <th className="pb-2 text-right">Операцій</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.stores.map((s) => (
                    <tr key={s.store_id}>
                      <td className="py-2 font-medium text-gray-900">{s.store_name}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(s.sales_total)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(s.deposits_total)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(s.withdrawals_total)}</td>
                      <td className="py-2 text-right tabular-nums">{s.operations_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  downloadExport(
                    `/api/reports/network/export?format=xlsx&${qs.slice(1)}`,
                    "network.xlsx",
                  )
                }
                className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-100"
              >
                Експорт XLSX
              </button>
              <button
                onClick={() =>
                  downloadExport(
                    `/api/reports/network/export?format=csv&${qs.slice(1)}`,
                    "network.csv",
                  )
                }
                className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-100"
              >
                Експорт CSV
              </button>
            </div>
          </>
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
