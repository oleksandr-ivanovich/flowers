interface NumpadProps {
  value: string;
  onChange: (next: string) => void;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];

export function Numpad({ value, onChange }: NumpadProps) {
  const press = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className="rounded-xl bg-gray-100 py-6 text-2xl font-semibold text-gray-900 hover:bg-gray-200 active:bg-gray-300"
        >
          {k}
        </button>
      ))}
    </div>
  );
}
