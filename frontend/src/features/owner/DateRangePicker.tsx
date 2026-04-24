interface Props {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
}

export function DateRangePicker({ dateFrom, dateTo, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-sm">
        <span className="mb-1 block text-gray-700">З</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-gray-700">По</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>
    </div>
  );
}

export function dateRangeParams(dateFrom: string, dateTo: string): string {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", `${dateFrom}T00:00:00`);
  if (dateTo) params.set("date_to", `${dateTo}T23:59:59`);
  const str = params.toString();
  return str ? `?${str}` : "";
}
