import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock
} from "lucide-react";
import { apiService } from "@/services/apiService";

interface DashboardProps {
  username: string;
}

const EnhancedDashboard = ({ username }: DashboardProps) => {
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

  const equipmentCards = [
    {
      title: "LNBs",
      count: stats.totalLNBs,
      icon: Radio,
      gradient: "from-green-500 to-green-600",
      bgGradient: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
      description: "Low Noise Block converters"
    },
    {
      title: "Switches",
      count: stats.totalSwitches,
      icon: Zap,
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
      description: "DiSEqC switches"
    },
    {
      title: "Motors",
      count: stats.totalMotors,
      icon: RotateCcw,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
      description: "Dish positioning motors"
    },
    {
      title: "Unicables",
      count: stats.totalUnicables,
      icon: Activity,
      gradient: "from-pink-500 to-pink-600",
      bgGradient: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900",
      description: "Unicable systems"
    },
    {
      title: "Satellites",
      count: stats.totalSatellites,
      icon: Satellite,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
      description: "Configured satellites"
    }
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center animate-pulse-glow">
            <Database className="h-7 w-7 text-primary-foreground" />
          </div>
          SDB Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Welcome back, <span className="font-semibold text-primary">{username}</span>
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20 animate-scale-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active configurations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment Items</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.totalLNBs + stats.totalSwitches + stats.totalMotors + stats.totalUnicables}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total equipment count
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satellites</CardTitle>
            <Satellite className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalSatellites}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Configured satellites
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{activities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recent actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Equipment Overview
            </CardTitle>
            <CardDescription>
              Distribution of equipment across all projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {equipmentCards.map((card, index) => (
              <div key={card.title} className={`p-4 rounded-lg ${card.bgGradient} animate-fade-in`} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${card.gradient} rounded-lg flex items-center justify-center`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{card.count}</div>
                    <Badge variant="secondary" className="text-xs">
                      {card.count > 0 ? 'Active' : 'None'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress 
                    value={card.count > 0 ? Math.min((card.count / 10) * 100, 100) : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions across all projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activities</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.details}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.username}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
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

      {/* Projects Overview */}
      <Card className="animate-scale-in" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Projects Overview
          </CardTitle>
          <CardDescription>
            All configured projects in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No projects found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, index) => (
                <div 
                  key={project.id} 
                  className="p-4 border rounded-lg bg-card hover:shadow-md transition-all duration-200 animate-fade-in hover:scale-105"
                  style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                >
                  <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created by {project.createdBy}</span>
                    <Badge variant="outline">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;