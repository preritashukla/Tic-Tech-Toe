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

const queryClient = new QueryClient();

const darkTheme = createTheme({
  palette: { mode: "dark" },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
});

const App = () => (
  <NextThemesProvider defaultTheme="dark" attribute="class">
    <ThemeProvider theme={darkTheme}>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </NextThemesProvider>
);

export default App;
