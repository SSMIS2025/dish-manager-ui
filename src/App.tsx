import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Database } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import LNBManagement from "./pages/LNBManagement";
import SwitchManagement from "./pages/SwitchManagement";
import MotorManagement from "./pages/MotorManagement";
import UnicableManagement from "./pages/UnicableManagement";
import SatelliteManagement from "./pages/SatelliteManagement";
import ProjectMapping from "./pages/ProjectMapping";
import CreateProjectFromBin from "./pages/CreateProjectFromBin";
import AdminActivity from "./pages/AdminActivity";
import NotFound from "./pages/NotFound";
import { storageService } from "./services/storageService";
import { sessionService } from "./services/sessionService";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    storageService.initialize();
    
    const existingSession = sessionService.getSession();
    if (existingSession) {
      setUser({ 
        username: existingSession.username, 
        isAdmin: existingSession.isAdmin 
      });
    }
    setIsLoading(false);
  }, []);

  // Update activity on user interaction
  const updateActivity = useCallback(() => {
    if (user) {
      sessionService.updateActivity();
    }
  }, [user]);

  // Set up activity listeners
  useEffect(() => {
    if (user) {
      // Update activity on various user interactions
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const throttledUpdate = throttle(updateActivity, 60000); // Update at most once per minute

      events.forEach(event => {
        window.addEventListener(event, throttledUpdate);
      });

      // Check session validity periodically
      const intervalId = setInterval(() => {
        const session = sessionService.getSession();
        if (!session) {
          setUser(null);
        }
      }, 60000); // Check every minute

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, throttledUpdate);
        });
        clearInterval(intervalId);
      };
    }
  }, [user, updateActivity]);

  const handleLogin = (username: string, isAdmin: boolean) => {
    setIsAnimating(true);
    
    // Save session
    sessionService.saveSession(username, isAdmin);
    
    setTimeout(() => {
      setUser({ username, isAdmin });
      setIsAnimating(false);
    }, 1500);
  };

  const handleLogout = () => {
    sessionService.clearSession();
    setUser(null);
  };

  // Initial loading check
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
                <h2 className="text-2xl font-bold">SDB Management</h2>
                <p className="text-muted-foreground">Initializing...</p>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Login animation
  if (isAnimating) {
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
              <div className="w-64 bg-muted rounded-full h-2 mx-auto">
                <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full animate-pulse" style={{ width: '80%' }}></div>
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
          <LoginScreen onLogin={handleLogin} />
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
                  <Route path="/satellite" element={<SatelliteManagement username={user.username} />} />
                  <Route path="/project-mapping" element={<ProjectMapping username={user.username} />} />
                  <Route path="/create-from-bin" element={<CreateProjectFromBin username={user.username} />} />
                  {user.isAdmin && (
                    <Route path="/admin/activity" element={<AdminActivity />} />
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

// Throttle utility
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export default App;
