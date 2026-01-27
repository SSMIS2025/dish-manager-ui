import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Database } from "lucide-react";
import AnimatedLoginScreen from "./components/AnimatedLoginScreen";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import LNBManagement from "./pages/LNBManagement";
import SwitchManagement from "./pages/SwitchManagement";
import MotorManagement from "./pages/MotorManagement";
import UnicableManagement from "./pages/UnicableManagement";
import SatelliteManagement from "./pages/SatelliteManagement";
import ProjectMapping from "./pages/ProjectMapping";
import AdminActivity from "./pages/AdminActivity";
import NotFound from "./pages/NotFound";
import { storageService } from "./services/storageService";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    storageService.initialize();
  }, []);

  const handleLogin = (username: string, isAdmin: boolean) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({ username, isAdmin });
      setIsLoading(false);
    }, 1500);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center animate-pulse-glow">
                <Database className="w-16 h-16 text-primary-foreground animate-float" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Welcome to SDB</h2>
                <p className="text-muted-foreground">Loading your dashboard...</p>
              </div>
              <div className="w-64 bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AnimatedLoginScreen onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex h-screen w-full bg-background animate-fade-in">
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
                  <Route path="/" element={<EnhancedDashboard username={user.username} />} />
                  <Route path="/lnb" element={<LNBManagement username={user.username} />} />
                  <Route path="/switch" element={<SwitchManagement username={user.username} />} />
                  <Route path="/motor" element={<MotorManagement username={user.username} />} />
                  <Route path="/unicable" element={<UnicableManagement username={user.username} />} />
                  <Route path="/project-mapping" element={<ProjectMapping username={user.username} />} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
