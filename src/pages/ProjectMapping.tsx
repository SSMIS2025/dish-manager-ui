import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, FolderOpen, Edit, Trash2, Download, Radio, Zap, RotateCcw, Activity, Satellite, Check, X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectMappingProps {
  username: string;
}

const ProjectMapping = ({ username }: ProjectMappingProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [formData, setFormData] = useState<{ name: string; description: string }>({ name: '', description: '' });
  
  // Equipment lists
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  
  // Project mappings
  const [projectMappings, setProjectMappings] = useState<any[]>([]);
  
  // Import source
  const [importSourceProject, setImportSourceProject] = useState<string>('');

  useEffect(() => {
    loadProjects();
    loadEquipment();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectMappings(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const allProjects = await apiService.getProjects();
    setProjects(allProjects);
    if (allProjects.length > 0 && !selectedProject) {
      setSelectedProject(allProjects[0]);
    }
  };

  const loadEquipment = async () => {
    const [lnbs, switches, motors, unicables, satellites] = await Promise.all([
      apiService.getEquipment('lnbs'),
      apiService.getEquipment('switches'),
      apiService.getEquipment('motors'),
      apiService.getEquipment('unicables'),
      apiService.getSatellites()
    ]);
    setAllLnbs(lnbs);
    setAllSwitches(switches);
    setAllMotors(motors);
    setAllUnicables(unicables);
    setAllSatellites(satellites);
  };

  const loadProjectMappings = async (projectId: string) => {
    const mappings = await apiService.getProjectMappings(projectId);
    setProjectMappings(mappings);
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || '' });
    setIsDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }

    if (editingProject) {
      await apiService.updateProject(editingProject.id, formData);
      await apiService.logActivity(username, "Project Updated", `Updated project: ${formData.name}`, editingProject.id);
      toast({ title: "Project Updated", description: "The project has been updated." });
    } else {
      await apiService.saveProject({ ...formData, createdBy: username });
      await apiService.logActivity(username, "Project Created", `Created project: ${formData.name}`, 'global');
      toast({ title: "Project Created", description: "The new project has been created." });
    }

    loadProjects();
    setIsDialogOpen(false);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    await apiService.deleteProject(selectedProject.id);
    await apiService.logActivity(username, "Project Deleted", `Deleted project: ${selectedProject.name}`, 'global');
    
    setSelectedProject(null);
    loadProjects();
    setIsDeleteDialogOpen(false);
    toast({ title: "Project Deleted", description: "The project has been deleted." });
  };

  const handleToggleMapping = async (equipmentType: string, equipmentId: string) => {
    if (!selectedProject) return;

    const existingMapping = projectMappings.find(
      m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
    );

    if (existingMapping) {
      await apiService.deleteProjectMapping(selectedProject.id, equipmentType, equipmentId);
      toast({ title: "Mapping Removed", description: "Equipment removed from project." });
    } else {
      await apiService.saveProjectMapping({
        projectId: selectedProject.id,
        equipmentType,
        equipmentId
      });
      toast({ title: "Mapping Added", description: "Equipment added to project." });
    }

    await apiService.logActivity(
      username, 
      existingMapping ? "Mapping Removed" : "Mapping Added", 
      `${existingMapping ? 'Removed' : 'Added'} ${equipmentType} mapping`, 
      selectedProject.id
    );

    loadProjectMappings(selectedProject.id);
  };

  const handleImportMappings = async () => {
    if (!selectedProject || !importSourceProject) {
      toast({
        title: "Validation Error",
        description: "Please select a source project.",
        variant: "destructive",
      });
      return;
    }

    await apiService.importProjectMappings(importSourceProject, selectedProject.id);
    await apiService.logActivity(username, "Mappings Imported", `Imported mappings from another project`, selectedProject.id);
    
    loadProjectMappings(selectedProject.id);
    setIsImportDialogOpen(false);
    toast({ title: "Import Complete", description: "Mappings have been imported." });
  };

  const isMapped = (equipmentType: string, equipmentId: string) => {
    return projectMappings.some(
      m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
    );
  };

  const getMappingCount = (equipmentType: string) => {
    return projectMappings.filter(m => m.equipmentType === equipmentType).length;
  };

  const equipmentTypes = [
    { key: 'lnbs', label: 'LNBs', icon: Radio, items: allLnbs, color: 'green' },
    { key: 'switches', label: 'Switches', icon: Zap, items: allSwitches, color: 'orange' },
    { key: 'motors', label: 'Motors', icon: RotateCcw, items: allMotors, color: 'purple' },
    { key: 'unicables', label: 'Unicables', icon: Activity, items: allUnicables, color: 'pink' },
    { key: 'satellites', label: 'Satellites', icon: Satellite, items: allSatellites, color: 'blue' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            Project Mapping
          </h2>
          <p className="text-muted-foreground mt-1">
            Create projects and map equipment from the global bucket
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProject && (
            <Button 
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Import from Project
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleAddProject}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-indigo-600" />
                  {editingProject ? "Edit Project" : "Create New Project"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., UK Satellite Configuration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProject}>
                  {editingProject ? "Update" : "Create"} Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Projects ({projects.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No projects found</p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedProject?.id === project.id 
                        ? 'bg-indigo-50 dark:bg-indigo-950 border-l-4 border-l-indigo-500' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {project.createdBy}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedProject(project);
                            setIsDeleteDialogOpen(true); 
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Equipment Mapping */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            {!selectedProject ? (
              <div className="text-center py-20 text-muted-foreground">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Select a project to manage equipment mappings</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedProject.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {equipmentTypes.map(({ key, label }) => (
                      <Badge key={key} variant="secondary">
                        {label}: {getMappingCount(key)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Tabs defaultValue="lnbs">
                  <TabsList className="mb-4">
                    {equipmentTypes.map(({ key, label, icon: Icon }) => (
                      <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                        <Icon className="h-4 w-4" />
                        {label} ({getMappingCount(key)})
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {equipmentTypes.map(({ key, label, items, color }) => (
                    <TabsContent key={key} value={key}>
                      <Card>
                        <CardHeader className={`py-3 bg-gradient-to-r from-${color}-500/10 to-${color}-600/5`}>
                          <CardTitle className="text-sm">
                            Select {label} to map to this project
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {items.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              No {label.toLowerCase()} available in the global bucket
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {items.map((item) => {
                                const mapped = isMapped(key, item.id);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleToggleMapping(key, item.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                      mapped 
                                        ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950` 
                                        : 'border-muted hover:border-muted-foreground/30'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h5 className="font-medium">{item.name}</h5>
                                        <p className="text-sm text-muted-foreground">
                                          {item.type || item.position || ''}
                                        </p>
                                      </div>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        mapped 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-muted'
                                      }`}>
                                        {mapped ? <Check className="h-4 w-4" /> : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Mappings from Project</DialogTitle>
            <DialogDescription>
              Select a project to import its equipment mappings into "{selectedProject?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Source Project</Label>
            <Select value={importSourceProject} onValueChange={setImportSourceProject}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(p => p.id !== selectedProject?.id)
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportMappings}>Import Mappings</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This will also remove all equipment mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectMapping;
