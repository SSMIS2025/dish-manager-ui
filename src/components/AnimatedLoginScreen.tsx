import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Satellite, Monitor, Activity } from "lucide-react";

interface LoginScreenProps {
  onLogin: (username: string, isAdmin: boolean) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const users = [
    { username: "admin", password: "admin123", isAdmin: true },
    { username: "user1", password: "user123", isAdmin: false },
    { username: "user2", password: "user123", isAdmin: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user.username, user.isAdmin);
    } else {
      setError("Invalid username or password");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex">
      {/* Left Side - Animated Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5"></div>
        
        {/* Floating Background Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full animate-float"></div>
        <div className="absolute bottom-32 right-32 w-24 h-24 bg-accent/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-20 w-16 h-16 bg-primary/5 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 text-center space-y-8 animate-fade-in">
          {/* Animated Logo */}
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center animate-pulse-glow shadow-2xl">
              <Database className="w-16 h-16 text-primary-foreground animate-float" />
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-accent rounded-full animate-ping"></div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SDB
            </h1>
            <p className="text-2xl font-semibold text-muted-foreground">
              Static Database Management
            </p>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Comprehensive satellite equipment management platform with advanced project controls
            </p>
          </div>

          {/* Feature Icons */}
          <div className="flex justify-center space-x-8 mt-12">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Satellite className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Satellites</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Equipment</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md animate-scale-in shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center lg:hidden">
              <Database className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your satellite management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12"
                  required
                />
              </div>
              {error && (
                <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg animate-fade-in">
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover transition-all duration-300 transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Demo Credentials:
              </p>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p><strong>Admin:</strong> admin / admin123</p>
                <p><strong>User:</strong> user1 / user123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;