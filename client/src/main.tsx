// Entry point: loads the styles and starts React with the page routes.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./styles/tokens.css";
import "./styles/global.css";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./auth/AuthContext";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
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
            <Route path="login" element={<LoginPage mode="login" />} />
            <Route path="register" element={<LoginPage mode="register" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
