import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ChatProvider } from "./contexts/ChatContext";
import { ReportJobProvider } from "./contexts/ReportJobContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import Home from "./pages/Home";
// import Pipeline from "./pages/Pipeline"; // hidden for now — re-enable with /pipeline routes below
import Agent from "./pages/Agent";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Fundos from "./pages/Fundos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <ChatProvider>
          <ReportJobProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Clerk Account Portal: these routes only redirect (no embedded UI) */}
              <Route path="/login/*" element={<Login />} />
              <Route path="/sign-up/*" element={<Register />} />
              <Route path="/register" element={<Navigate to="/sign-up" replace />} />

              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppLayout><Home /></AppLayout>
                  </RequireAuth>
                }
              />
              {/* Pipeline — hidden for now; send bookmarks to Home (re-enable routes + Pipeline import)
              <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/cedentes" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/cedentes/:cedenteId" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/recebiveis" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/recebiveis/:workflowId" element={<AppLayout><Pipeline /></AppLayout>} />
              */}
              <Route path="/pipeline/*" element={<Navigate to="/" replace />} />
              <Route
                path="/agent"
                element={
                  <RequireAuth>
                    <AppLayout><Agent /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/agent/:conversationId"
                element={
                  <RequireAuth>
                    <AppLayout><Agent /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route path="/graficos" element={<Navigate to="/fundos/graficos" replace />} />
              <Route
                path="/fundos"
                element={
                  <RequireAuth>
                    <Fundos />
                  </RequireAuth>
                }
              />
              <Route
                path="/fundos/:tab"
                element={
                  <RequireAuth>
                    <Fundos />
                  </RequireAuth>
                }
              />
              <Route
                path="/fundos/:tab/:fundoId"
                element={
                  <RequireAuth>
                    <Fundos />
                  </RequireAuth>
                }
              />
              {/* Legacy routes redirect to the new Fundos hub */}
              <Route path="/controle-de-ativos" element={<Navigate to="/fundos" replace />} />
              <Route path="/relatorio-teste" element={<Navigate to="/fundos" replace />} />
              <Route path="/controle-de-obras" element={<Navigate to="/fundos" replace />} />
              <Route path="/demo/plotly" element={<Navigate to="/fundos/graficos" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ReportJobProvider>
        </ChatProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
