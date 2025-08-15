import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Import, Trash2, Eye } from "lucide-react";
import { useProject, Project } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";

interface ProjectSelectorProps {
  username: string;
  isAdmin: boolean;
}

const ProjectSelector = ({ username, isAdmin }: ProjectSelectorProps) => {
  const { projects, currentProject, setCurrentProject, createProject, deleteProject, importProjectData } = useProject();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedSourceProject, setSelectedSourceProject] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }

    createProject(newProjectName, newProjectDescription, username);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Project Created",
      description: `Project "${newProjectName}" has been created successfully.`,
    });
  };

  const handleImportData = () => {
    if (!currentProject || !selectedSourceProject) return;
    
    const sourceProject = projects.find(p => p.id === selectedSourceProject);
    if (!sourceProject) return;

    importProjectData(currentProject.id, sourceProject);
    setSelectedSourceProject("");
    setIsImportDialogOpen(false);
    
    toast({
      title: "Data Imported",
      description: `Equipment data imported from "${sourceProject.name}".`,
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one project.",
        variant: "destructive",
      });
      return;
    }

    deleteProject(projectId);
    toast({
      title: "Project Deleted",
      description: "Project has been deleted successfully.",
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Current Project
            </CardTitle>
            <CardDescription>
              Select and manage your satellite equipment projects
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new satellite equipment project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Description</Label>
                    <Input
                      id="projectDescription"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject}>
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {currentProject && (
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Import className="mr-2 h-4 w-4" />
                    Import Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Project Data</DialogTitle>
                    <DialogDescription>
                      Import equipment data from another project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Source Project</Label>
                      <Select value={selectedSourceProject} onValueChange={setSelectedSourceProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project to import from" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects
                            .filter(p => p.id !== currentProject.id)
                            .map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleImportData} disabled={!selectedSourceProject}>
                        Import Data
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  currentProject?.id === project.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setCurrentProject(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {project.createdBy}
                      </Badge>
                      {currentProject?.id === project.id && (
                        <Badge className="text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                  {projects.length > 1 && (isAdmin || project.createdBy === username) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSelector;