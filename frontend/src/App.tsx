import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Logs from "./pages/Logs";
import MockGitHub from "./pages/mock/github";
import MockJira from "./pages/mock/jira";
import MockSlack from "./pages/mock/slack";
import MockSheets from "./pages/mock/sheets";

const queryClient = new QueryClient();

import { useMemo } from "react";
import { useTheme } from "next-themes";

const MuiThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(() => createTheme({
    palette: { mode: resolvedTheme === "light" ? "light" : "dark" },
    typography: { fontFamily: "Inter, system-ui, sans-serif" },
  }), [resolvedTheme]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
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
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/:id" element={<Dashboard />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/mock/github" element={<MockGitHub />} />
              <Route path="/mock/jira" element={<MockJira />} />
              <Route path="/mock/slack" element={<MockSlack />} />
              <Route path="/mock/sheets" element={<MockSheets />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </MuiThemeWrapper>
  </NextThemesProvider>
);

export default App;
