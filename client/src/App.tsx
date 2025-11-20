import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import Income from "@/pages/income";
import Investments from "@/pages/investments";
import Goals from "@/pages/goals";
import Alerts from "@/pages/alerts";
import Reports from "@/pages/reports";
import UserPreferences from "@/pages/user-preferences";
import AccountsPage from "@/pages/accounts";
import Sidebar from "@/components/layout/sidebar";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import OAuthCallbackPage from "@/pages/oauth-callback";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { PreferencesInitializer } from "@/components/preferences-initializer";
import { LanguageReloader } from "@/components/language-reloader";
import { AuthInitializer } from "@/components/auth-initializer";

// Layout principal para as rotas protegidas
const MainLayout = () => (
  <div className="flex min-h-screen bg-gray-50 dark:bg-background">
    <Sidebar />
    <main className="flex-1 overflow-auto">
      <div className="flex justify-end items-center p-2 bg-white shadow-sm">
        <LanguageReloader />
      </div>
      <div className="p-6">
        <Outlet /> {/* As rotas filhas serão renderizadas aqui */}
      </div>
    </main>
  </div>
);

// Componente para proteger o acesso às rotas
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
};

// Componente para rotas públicas: se já autenticado, redireciona para o dashboard
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <PreferencesInitializer />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {/**
           * Em desenvolvimento usamos HashRouter para evitar 404 do Vite ao acessar rotas diretamente.
           * Em produção (build) usamos BrowserRouter normalmente.
           */}
          {import.meta.env.DEV ? (
            <HashRouter>
              <AuthProvider>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                <Route path="/oauth/callback" element={<PublicRoute><OAuthCallbackPage /></PublicRoute>} />
                
                {/* Rotas Protegidas */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/income" element={<Income />} />
                  <Route path="/investments" element={<Investments />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/preferences" element={<UserPreferences />} />
                  {/** initialize-data removed */}
                </Route>

                {/* Rota para Página Não Encontrada */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </AuthProvider>
            </HashRouter>
          ) : (
            <BrowserRouter>
              <AuthProvider>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                
                {/* Rotas Protegidas */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/income" element={<Income />} />
                  <Route path="/investments" element={<Investments />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/preferences" element={<UserPreferences />} />
                  {/** initialize-data removed */}
                </Route>

                {/* Rota para Página Não Encontrada */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </AuthProvider>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
