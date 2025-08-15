import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Filter } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { PaginationCustom } from "@/components/ui/pagination-custom";

const AdminActivity = () => {
  const { userActivities, projects } = useProject();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredActivities = userActivities.filter(activity => {
    const matchesSearch = 
      activity.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = selectedProject === "all" || activity.projectId === selectedProject;
    
    return matchesSearch && matchesProject;
  });

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

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

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("Created") || action.includes("Added")) return "default";
    if (action.includes("Updated") || action.includes("Modified")) return "secondary";
    if (action.includes("Deleted") || action.includes("Removed")) return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          User Activity Log
        </h2>
        <p className="text-muted-foreground">
          Monitor all user activities across projects
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredActivities.length} activities)</CardTitle>
          <CardDescription>
            Complete history of user actions and modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Project</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No activities found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedActivities.map((activity) => {
                  const project = projects.find(p => p.id === activity.projectId);
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-mono text-sm">
                        {formatTimestamp(activity.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {activity.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {activity.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {activity.details}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {project?.name || "Unknown Project"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {filteredActivities.length > itemsPerPage && (
            <PaginationCustom
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivity;