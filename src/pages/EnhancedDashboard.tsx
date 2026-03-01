import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Satellite, 
  Radio, 
  RotateCcw, 
  Zap, 
  Activity,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  FileText,
  FolderOpen,
  ChevronRight
} from "lucide-react";
import { apiService } from "@/services/apiService";

interface DashboardProps {
  username: string;
}

const EnhancedDashboard = ({ username }: DashboardProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalLNBs: 0,
    totalSwitches: 0,
    totalMotors: 0,
    totalUnicables: 0,
    totalSatellites: 0,
    recentActivities: 0
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allProjects, allActivities, lnbs, switches, motors, unicables, satellites] = await Promise.all([
      apiService.getProjects(),
      apiService.getActivities(),
      apiService.getEquipment('lnbs'),
      apiService.getEquipment('switches'),
      apiService.getEquipment('motors'),
      apiService.getEquipment('unicables'),
      apiService.getSatellites()
    ]);
    
    setProjects(allProjects);
    setActivities(allActivities.slice(0, 5));
    
    setStats({
      totalProjects: allProjects.length,
      totalLNBs: lnbs.length,
      totalSwitches: switches.length,
      totalMotors: motors.length,
      totalUnicables: unicables.length,
      totalSatellites: satellites.length,
      recentActivities: allActivities.slice(0, 5).length
    });
  };

  const totalEquipment = stats.totalLNBs + stats.totalSwitches + stats.totalMotors + stats.totalUnicables;

  const quickLinks = [
    { label: "Project Mapping", icon: FolderOpen, path: "/project-mapping", color: "text-primary" },
    { label: "Project Report", icon: FileText, path: "/project-report", color: "text-blue-600" },
    { label: "Satellites", icon: Satellite, path: "/satellite", color: "text-orange-600" },
  ];

  const equipmentCards = [
    { title: "LNBs", count: stats.totalLNBs, icon: Radio, gradient: "from-emerald-500 to-teal-600", path: "/lnb" },
    { title: "Switches", count: stats.totalSwitches, icon: Zap, gradient: "from-amber-500 to-orange-600", path: "/switch" },
    { title: "Motors", count: stats.totalMotors, icon: RotateCcw, gradient: "from-violet-500 to-purple-600", path: "/motor" },
    { title: "Unicables", count: stats.totalUnicables, icon: Activity, gradient: "from-rose-500 to-pink-600", path: "/unicable" },
    { title: "Satellites", count: stats.totalSatellites, icon: Satellite, gradient: "from-sky-500 to-blue-600", path: "/satellite" },
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0xMHY2aC02di02aDZ6bTEwIDB2Nmg2di02aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center animate-pulse-glow">
                <Database className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">SDB Dashboard</h1>
                <p className="text-primary-foreground/80 text-lg">
                  Welcome back, <span className="font-semibold">{username}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {quickLinks.map(link => (
              <Button
                key={link.path}
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-primary-foreground border-white/20 backdrop-blur-sm"
                onClick={() => navigate(link.path)}
              >
                <link.icon className="h-4 w-4 mr-2" />
                {link.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-primary/20" onClick={() => navigate('/project-mapping')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold">{stats.totalProjects}</p>
            <p className="text-sm text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-emerald-500/20" onClick={() => navigate('/lnb')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold">{totalEquipment}</p>
            <p className="text-sm text-muted-foreground">Equipment</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-sky-500/20" onClick={() => navigate('/satellite')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                <Satellite className="h-5 w-5 text-sky-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold">{stats.totalSatellites}</p>
            <p className="text-sm text-muted-foreground">Satellites</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-violet-500/20" onClick={() => navigate('/admin/activity')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold">{activities.length}</p>
            <p className="text-sm text-muted-foreground">Recent Activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Strip */}
      <div className="grid grid-cols-5 gap-3">
        {equipmentCards.map((card, index) => (
          <Card 
            key={card.title} 
            className="group cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
            onClick={() => navigate(card.path)}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardContent className="p-4 relative">
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${card.gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`}></div>
              <div className={`w-9 h-9 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center mb-3`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-2xl font-bold">{card.count}</p>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects - takes 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Projects
                </CardTitle>
                <CardDescription>Click to view full report</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/project-report')}>
                <FileText className="h-4 w-4 mr-1" />
                View Reports
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No projects found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="group relative p-4 border rounded-xl bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => navigate('/project-report')}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold">{project.name}</h3>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 pl-10">{project.description || 'No description'}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pl-10">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.createdBy}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity - 1 col */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activities</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0 animate-pulse"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.details}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {activity.username}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
