import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Satellite, Lock, User, Loader2, Database, Radio, Zap, RotateCcw } from "lucide-react";
import { apiService } from "@/services/apiService";
import { STORAGE_MODE } from "@/config/database";

interface LoginScreenProps {
  onLogin: (username: string, isAdmin: boolean) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      usernameRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      passwordRef.current?.focus();
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await apiService.verifyLogin(username, password);
      
      if (result.valid) {
        onLogin(username, result.isAdmin);
      } else {
        setError("Invalid username or password");
        passwordRef.current?.focus();
      }
    } catch (err) {
      setError("Failed to verify credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - SDB Tool Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-accent relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/30">
              <Satellite className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold text-white mb-4 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            SDB Tool
          </h1>
          <p className="text-xl text-white/80 mb-12 text-center max-w-md animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Static Database Management System for Satellite Equipment Configuration
          </p>

          {/* Feature Icons */}
          <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">LNB Control</h3>
                <p className="text-white/60 text-sm">Manage LNB settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Switch Config</h3>
                <p className="text-white/60 text-sm">DiSEqC switching</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Motor Setup</h3>
                <p className="text-white/60 text-sm">Position control</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Project Export</h3>
                <p className="text-white/60 text-sm">BIN generation</p>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="absolute bottom-8 text-white/50 text-sm">
            SDB Management Tool v2.0
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo (shown on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Satellite className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SDB Tool</h1>
          </div>

          {/* Login Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">
              Sign in to access your satellite database
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-11 h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 bg-card border-border"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={passwordRef}
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 bg-card border-border"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Storage Mode Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${
              STORAGE_MODE === 'mysql' ? 'bg-green-500' : 
              STORAGE_MODE === 'electron' ? 'bg-blue-500' : 
              'bg-yellow-500'
            }`} />
            <span>Storage Mode: <span className="font-medium text-foreground">{STORAGE_MODE.toUpperCase()}</span></span>
          </div>

          {/* Demo Credentials */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <p className="text-sm font-medium text-foreground mb-2">Demo Credentials:</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="bg-card rounded-lg p-2 text-center border border-border">
                <p className="font-semibold text-foreground">Admin</p>
                <p>admin / admin123</p>
              </div>
              <div className="bg-card rounded-lg p-2 text-center border border-border">
                <p className="font-semibold text-foreground">User</p>
                <p>user / user123</p>
              </div>
              <div className="bg-card rounded-lg p-2 text-center border border-border">
                <p className="font-semibold text-foreground">Operator</p>
                <p>operator / op123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
