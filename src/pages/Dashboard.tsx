import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Zap, Settings, Router, Satellite, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ProjectSelector from "@/components/ProjectSelector";
import { useProject } from "@/contexts/ProjectContext";

interface DashboardProps {
  isAdmin: boolean;
  username: string;
}

const Dashboard = ({ isAdmin, username }: DashboardProps) => {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // Sample data - would be loaded from JSON files
  const stats = [
    { 
      title: "LNB Devices", 
      count: 12, 
      icon: Radio, 
      color: "from-blue-500 to-blue-600",
      path: "/lnb"
    },
    { 
      title: "Switches", 
      count: 8, 
      icon: Zap, 
      color: "from-green-500 to-green-600",
      path: "/switch"
    },
    { 
      title: "Motors", 
      count: 5, 
      icon: Settings, 
      color: "from-purple-500 to-purple-600",
      path: "/motor"
    },
    { 
      title: "Unicable", 
      count: 3, 
      icon: Router, 
      color: "from-orange-500 to-orange-600",
      path: "/unicable"
    },
    { 
      title: "Satellites", 
      count: 15, 
      icon: Satellite, 
      color: "from-red-500 to-red-600",
      path: "/satellite",
      adminOnly: true
    },
  ];

  const recentActivity = [
    { action: "Added new LNB", device: "LNB-001", time: "2 hours ago", type: "create" },
    { action: "Updated Switch", device: "SW-003", time: "4 hours ago", type: "update" },
    { action: "Configured Motor", device: "MT-002", time: "1 day ago", type: "config" },
    { action: "Satellite maintenance", device: "SAT-ASTRA", time: "2 days ago", type: "maintenance" },
  ];

  const filteredStats = stats.filter(stat => !stat.adminOnly || isAdmin);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your satellite equipment database
        </p>
      </div>

      <ProjectSelector username={username} isAdmin={isAdmin} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStats.map((stat) => (
          <Card 
            key={stat.title} 
            className="cursor-pointer hover:shadow-card transition-all duration-200 hover:scale-105"
            onClick={() => navigate(stat.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              <p className="text-xs text-muted-foreground">
                Total devices configured
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest changes to your equipment database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.device} • {activity.time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
              onClick={() => navigate("/lnb")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New LNB
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/switch")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Configure Switch
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/satellite")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Manage Satellites
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;