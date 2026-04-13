import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo } from "react";
import { useTheme } from "next-themes";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToolsProvider }         from "@/context/ToolsContext";
import ProtectedRoute            from "@/components/ProtectedRoute";

import Landing          from "./pages/Landing";
import LoginPage        from "./pages/LoginPage";
import ConnectTools     from "./pages/ConnectTools";
import AgenticChatUI    from "./AgenticChatUI";
import ManagerLayout    from "./components/manager/ManagerLayout";
import NotFound         from "./pages/NotFound";
import Logs             from "./pages/Logs";
import Layout           from "./components/Layout";

const queryClient = new QueryClient();

const MuiThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(() => createTheme({
    palette: { mode: resolvedTheme === "light" ? "light" : "dark" },
    typography: { fontFamily: "Inter, system-ui, sans-serif" },
  }), [resolvedTheme]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

/** Role-aware dashboard: Manager → separate layout | Developer → full Agentic Chat */
const RoleRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'manager') {
    return <ManagerLayout />;
  }
  return <AgenticChatUI />;
};

const App = () => (
  <NextThemesProvider defaultTheme="dark" attribute="class">
    <MuiThemeWrapper>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ToolsProvider>
                <Routes>
                  {/* Public */}
                  <Route path="/"      element={<Landing />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Post-login: connect tools */}
                  <Route path="/connect-tools" element={
                    <ProtectedRoute><ConnectTools /></ProtectedRoute>
                  } />

                  {/* Protected — role-aware dashboard */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute><RoleRouter /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/:id" element={
                    <ProtectedRoute><RoleRouter /></ProtectedRoute>
                  } />

                  {/* Protected — developer routes */}
                  <Route path="/logs" element={
                    <ProtectedRoute><Logs /></ProtectedRoute>
                  } />


                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ToolsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </MuiThemeWrapper>
  </NextThemesProvider>
);

export default App;
