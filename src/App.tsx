import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ChatProvider } from "./contexts/ChatContext";
import Home from "./pages/Home";
// import Pipeline from "./pages/Pipeline"; // hidden for now — re-enable with /pipeline routes below
import Agent from "./pages/Agent";
// Auth temporarily disabled
// import Login from "./pages/Login";
// import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Graficos from "./pages/Graficos";
import RelatorioTeste from "./pages/RelatorioTeste";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <ChatProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth routes temporarily disabled */}
              {/*
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              */}

              <Route path="/" element={<AppLayout><Home /></AppLayout>} />
              {/* Pipeline — hidden for now; send bookmarks to Home (re-enable routes + Pipeline import)
              <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/cedentes" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/cedentes/:cedenteId" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/recebiveis" element={<AppLayout><Pipeline /></AppLayout>} />
              <Route path="/pipeline/recebiveis/:workflowId" element={<AppLayout><Pipeline /></AppLayout>} />
              */}
              <Route path="/pipeline/*" element={<Navigate to="/" replace />} />
              <Route path="/agent" element={<AppLayout><Agent /></AppLayout>} />
              <Route path="/agent/:conversationId" element={<AppLayout><Agent /></AppLayout>} />
              <Route path="/graficos" element={<AppLayout><Graficos /></AppLayout>} />
              <Route path="/controle-de-obras" element={<AppLayout><RelatorioTeste /></AppLayout>} />
              <Route path="/relatorio-teste" element={<Navigate to="/controle-de-obras" replace />} />
              <Route path="/demo/plotly" element={<Navigate to="/graficos" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

