import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";
import { AuthedLayout } from "./AuthedLayout";
import { AppShell } from "@/components/layout/AppShell";

import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AccountPage } from "@/pages/AccountPage";
import { PlanPage } from "@/pages/PlanPage";
import { RecipesPage } from "@/pages/RecipesPage";
import { RecipeEditorPage } from "@/pages/RecipeEditorPage";
import { ShoppingPage } from "@/pages/ShoppingPage";
import { InventoryPage } from "@/pages/InventoryPage";

// Password auth ne koristi callback, ali ostavljamo kao "safety net"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Optional safety net */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* PROTECTED AREA */}
        <Route
          element={
            <RequireAuth>
              <AuthedLayout />
            </RequireAuth>
          }
        >
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/plan" replace />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipes/new" element={<RecipeEditorPage mode="create" />} />
            <Route path="/recipes/:id" element={<RecipeEditorPage mode="edit" />} />
            <Route path="/shopping" element={<ShoppingPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}