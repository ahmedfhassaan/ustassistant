import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminKnowledge from "./pages/AdminKnowledge";
import AdminFAQ from "./pages/AdminFAQ";
import AdminSettings from "./pages/AdminSettings";
import AdminStudents from "./pages/AdminStudents";
import AdminFeedback from "./pages/AdminFeedback";
import AdminEvaluation from "./pages/AdminEvaluation";

const queryClient = new QueryClient();

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const admin = localStorage.getItem("admin");
  if (!admin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/chat" element={<Chat />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="knowledge" element={<AdminKnowledge />} />
              <Route path="faq" element={<AdminFAQ />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="evaluation" element={<AdminEvaluation />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
