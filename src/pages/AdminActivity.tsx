import { useState, useEffect } from "react";
import { storageService } from "@/services/storageService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Activity, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationCustom } from "@/components/ui/pagination-custom";

const AdminActivity = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Filters
  const [usernameFilter, setUsernameFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activities, usernameFilter, actionFilter, projectFilter]);

  const loadData = () => {
    const allActivities = storageService.getActivities();
    const allProjects = storageService.getProjects();
    
    setActivities(allActivities);
    setProjects(allProjects);
  };

  const applyFilters = () => {
    let filtered = activities;

    if (usernameFilter) {
      filtered = filtered.filter(activity => 
        activity.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    if (actionFilter) {
      filtered = filtered.filter(activity => 
        activity.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    if (projectFilter && projectFilter !== "all") {
      filtered = filtered.filter(activity => activity.projectId === projectFilter);
    }

    setFilteredActivities(filtered);
    setCurrentPage(1);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Unknown Project";
  };

  const getActionColor = (action: string) => {
    if (action.includes("Added") || action.includes("Created")) return "default";
    if (action.includes("Updated")) return "secondary";
    if (action.includes("Deleted")) return "destructive";
    return "outline";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}${month}${year} ${hours}:${minutes}:${seconds}`;
  };

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Admin Activity Monitor
          </h2>
          <p className="text-muted-foreground">
            Track all user activities and system changes across projects
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Activity Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                placeholder="Filter by username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Filter by action"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <div className="space-y-4">
        {paginatedActivities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {activities.length === 0 ? "No activities found" : "No activities match your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          paginatedActivities.map((activity, index) => (
            <Card 
              key={activity.id} 
              className="animate-fade-in hover:shadow-md transition-shadow"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{activity.action}</CardTitle>
                      <CardDescription className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{activity.username}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(activity.timestamp)}</span>
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getActionColor(activity.action)}>
                    {activity.action}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Details:</strong> {activity.details}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Project:</strong> {getProjectName(activity.projectId)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Activity ID: {activity.id}</span>
                    <span>Timestamp: {activity.timestamp}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredActivities.length > itemsPerPage && (
        <PaginationCustom
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{activities.length}</div>
              <div className="text-sm text-muted-foreground">Total Activities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.action.includes("Added") || a.action.includes("Created")).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {activities.filter(a => a.action.includes("Updated")).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Updated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.action.includes("Deleted")).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Deleted</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivity;