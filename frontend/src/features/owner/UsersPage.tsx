import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Store, User, UserRole } from "@/lib/types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "cashier", label: "Касир" },
  { value: "store_admin", label: "Адміністратор магазину" },
  { value: "owner", label: "Власник" },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const isOwner = me?.role === "owner";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [storeId, setStoreId] = useState<number | "">("");

  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiGet<Store[]>("/api/stores"),
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  const createUser = useMutation({
    mutationFn: () =>
      apiPost<User>("/api/users", {
        email,
        password,
        full_name: fullName,
        role,
        store_id: role === "owner" ? null : storeId || null,
      }),
    onSuccess: () => {
      setEmail("");
      setPassword("");
      setFullName("");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const storeList = stores.data ?? [];
  const roleOptions = isOwner ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value === "cashier");

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Користувачі</h1>
        <Link to="/owner" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100">
          Назад
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUser.mutate();
          }}
          className="space-y-3 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900">Новий користувач</h2>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Повне імʼя"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль (мінімум 6 символів)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {role !== "owner" && (
            <select
              required
              value={storeId}
              onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              <option value="">— виберіть магазин —</option>
              {storeList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={createUser.isPending}
            className="w-full rounded-lg bg-gray-900 py-3 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            Створити
          </button>
          {createUser.isError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Не вдалось створити користувача
            </div>
          )}
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-medium text-gray-900">Існуючі користувачі</h2>
          {users.isLoading ? (
            <div className="text-sm text-gray-500">Завантаження…</div>
          ) : (
            <ul className="divide-y">
              {(users.data ?? []).map((u) => {
                const storeName = storeList.find((s) => s.id === u.store_id)?.name;
                return (
                  <li key={u.id} className="py-3">
                    <div className="font-medium text-gray-900">{u.full_name}</div>
                    <div className="text-xs text-gray-500">
                      {u.email} · {ROLE_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}
                      {storeName && ` · ${storeName}`}
                      {!u.is_active && " · неактивний"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
