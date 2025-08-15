import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import LNBManagement from "./pages/LNBManagement";
import SwitchManagement from "./pages/SwitchManagement";
import MotorManagement from "./pages/MotorManagement";
import UnicableManagement from "./pages/UnicableManagement";
import SatelliteManagement from "./pages/SatelliteManagement";
import AdminActivity from "./pages/AdminActivity";
import NotFound from "./pages/NotFound";
import { ProjectProvider } from "./contexts/ProjectContext";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogin = (username: string, isAdmin: boolean) => {
    setUser({ username, isAdmin });
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LoginScreen onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProjectProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex h-screen w-full bg-background">
              <Sidebar 
                collapsed={sidebarCollapsed} 
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                isAdmin={user.isAdmin}
              />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                  username={user.username} 
                  isAdmin={user.isAdmin}
                  onLogout={handleLogout}
                />
                <main className="flex-1 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard isAdmin={user.isAdmin} username={user.username} />} />
                    <Route path="/lnb" element={<LNBManagement username={user.username} />} />
                    <Route path="/switch" element={<SwitchManagement username={user.username} />} />
                    <Route path="/motor" element={<MotorManagement username={user.username} />} />
                    <Route path="/unicable" element={<UnicableManagement username={user.username} />} />
                    {user.isAdmin && (
                      <>
                        <Route path="/satellite" element={<SatelliteManagement username={user.username} />} />
                        <Route path="/admin/activity" element={<AdminActivity />} />
                      </>
                    )}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </BrowserRouter>
        </ProjectProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
