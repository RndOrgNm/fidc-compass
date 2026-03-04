import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ChatProvider } from "./contexts/ChatContext";
import Home from "./pages/Home";
import Pipeline from "./pages/Pipeline";
import Agent from "./pages/Agent";
// Auth temporarily disabled
// import Login from "./pages/Login";
// import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
            <Route path="/agent" element={<AppLayout><Agent /></AppLayout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
