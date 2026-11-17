// Entry point: loads the styles and starts React with the page routes.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./styles/tokens.css";
import "./styles/global.css";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { StatusPage } from "./pages/StatusPage";
import { LoginPage } from "./pages/LoginPage";
import { MyCasesPage } from "./pages/MyCasesPage";
import { CaseFormPage } from "./pages/CaseFormPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { MedicinePage } from "./pages/MedicinePage";
import { DemoCasesPage } from "./pages/DemoCasesPage";
import { ClaimsPage } from "./pages/ClaimsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The page is missing its #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="login" element={<LoginPage mode="login" />} />
            <Route path="register" element={<LoginPage mode="register" />} />

            {/* Public, read-only demo cases. */}
            <Route path="demo" element={<DemoCasesPage />} />
            <Route path="demo/:id" element={<CaseDetailPage demo />} />
            <Route path="demo/:id/medicines/:medicineId" element={<MedicinePage demo />} />

            {/* Your own cases: log in first. (The API checks ownership on every request regardless.) */}
            <Route path="cases" element={<RequireAuth><MyCasesPage /></RequireAuth>} />
            <Route path="cases/new" element={<RequireAuth><CaseFormPage /></RequireAuth>} />
            <Route path="cases/:id" element={<RequireAuth><CaseDetailPage demo={false} /></RequireAuth>} />
            <Route path="cases/:id/edit" element={<RequireAuth><CaseFormPage /></RequireAuth>} />
            <Route path="claims" element={<RequireAuth><ClaimsPage /></RequireAuth>} />
            <Route path="cases/:id/medicines/:medicineId" element={<RequireAuth><MedicinePage demo={false} /></RequireAuth>} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
