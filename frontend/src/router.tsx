import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "@/features/auth/LoginPage";
import AddSalePage from "@/features/cashier/AddSalePage";
import CloseShiftPage from "@/features/cashier/CloseShiftPage";
import DepositPage from "@/features/cashier/DepositPage";
import WithdrawalPage from "@/features/cashier/WithdrawalPage";
import HomePage from "@/features/home/HomePage";
import CustomersPage from "@/features/owner/CustomersPage";
import NetworkReportPage from "@/features/owner/NetworkReportPage";
import OwnerPanel from "@/features/owner/OwnerPanel";
import StoreReportPage from "@/features/owner/StoreReportPage";
import StoresPage from "@/features/owner/StoresPage";
import UsersPage from "@/features/owner/UsersPage";
import { useAuth } from "@/lib/auth";

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50 text-gray-500">
        Завантаження…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<HomePage />} />
      <Route
        path="/sale"
        element={
          <RequireRole roles={["cashier", "store_admin"]}>
            <AddSalePage />
          </RequireRole>
        }
      />
      <Route
        path="/deposit"
        element={
          <RequireRole roles={["cashier", "store_admin"]}>
            <DepositPage />
          </RequireRole>
        }
      />
      <Route
        path="/withdrawal"
        element={
          <RequireRole roles={["cashier", "store_admin"]}>
            <WithdrawalPage />
          </RequireRole>
        }
      />
      <Route
        path="/shift/close"
        element={
          <RequireRole roles={["cashier", "store_admin"]}>
            <CloseShiftPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner"
        element={
          <RequireRole roles={["owner", "store_admin"]}>
            <OwnerPanel />
          </RequireRole>
        }
      />
      <Route
        path="/owner/stores"
        element={
          <RequireRole roles={["owner"]}>
            <StoresPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/users"
        element={
          <RequireRole roles={["owner", "store_admin"]}>
            <UsersPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/customers"
        element={
          <RequireRole roles={["owner"]}>
            <CustomersPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/store/:id/report"
        element={
          <RequireRole roles={["owner", "store_admin"]}>
            <StoreReportPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/network-report"
        element={
          <RequireRole roles={["owner"]}>
            <NetworkReportPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
