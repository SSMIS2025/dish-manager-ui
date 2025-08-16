import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Satellite, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { PaginationCustom } from "@/components/ui/pagination-custom";
import SatelliteStepForm from "@/components/SatelliteStepForm";

interface SatelliteData {
  id: string;
  name: string;
  position: string;
  age: string;
  direction: string;
  services: string[];
  carriers: string[];
  lnbCount: number;
  switchCount: number;
  motorCount: number;
  unicableCount: number;
}

interface SatelliteManagementProps {
  username: string;
}

const SatelliteManagement = ({ username }: SatelliteManagementProps) => {
  const { toast } = useToast();
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStepFormOpen, setIsStepFormOpen] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});

  const directions = ["East", "West"];

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadSatellites();
    }
  }, [selectedProject]);

  const loadProjects = () => {
    const allProjects = storageService.getProjects();
    setProjects(allProjects);
    if (allProjects.length > 0 && !selectedProject) {
      setSelectedProject(allProjects[0].id);
    }
  };

  const loadSatellites = () => {
    if (selectedProject) {
      const projectSatellites = storageService.getEquipment('satellites', selectedProject);
      const satelliteData: SatelliteData[] = projectSatellites.map(sat => ({
        id: sat.id,
        name: sat.name,
        position: sat.position || "",
        age: sat.age || "",
        direction: sat.direction || "",
        services: sat.services || [],
        carriers: sat.carriers || [],
        lnbCount: sat.lnbCount || 0,
        switchCount: sat.switchCount || 0,
        motorCount: sat.motorCount || 0,
        unicableCount: sat.unicableCount || 0
      }));
      setSatellites(satelliteData);
    }
  };

  const handleAdd = () => {
    setEditingSatellite(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleAddWithSteps = () => {
    setIsStepFormOpen(true);
  };

  const handleEdit = (satellite: SatelliteData) => {
    setEditingSatellite(satellite);
    setFormData({
      ...satellite,
      services: satellite.services,
      carriers: satellite.carriers
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const satellite = satellites.find(s => s.id === id);
    storageService.deleteEquipment('satellites', id);
    storageService.logActivity(username, "Satellite Deleted", `Deleted satellite: ${satellite?.name}`, selectedProject);
    
    loadSatellites();
    toast({
      title: "Satellite Deleted",
      description: "The satellite has been successfully removed.",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    const satelliteData = {
      ...formData,
      services: formData.services || [],
      carriers: formData.carriers || [],
      lnbCount: formData.lnbCount || 0,
      switchCount: formData.switchCount || 0,
      motorCount: formData.motorCount || 0,
      unicableCount: formData.unicableCount || 0
    } as Omit<SatelliteData, 'id'>;

    if (editingSatellite) {
      storageService.updateEquipment('satellites', editingSatellite.id, satelliteData);
      storageService.logActivity(username, "Satellite Updated", `Updated satellite: ${formData.name}`, selectedProject);
      
      toast({
        title: "Satellite Updated",
        description: "The satellite has been successfully updated.",
      });
    } else {
      storageService.saveEquipment('satellites', { ...satelliteData, type: 'satellite' }, selectedProject);
      storageService.logActivity(username, "Satellite Added", `Added new satellite: ${formData.name}`, selectedProject);
      
      toast({
        title: "Satellite Added",
        description: "The new satellite has been successfully added.",
      });
    }
    
    loadSatellites();
    setIsDialogOpen(false);
    setFormData({});
  };

  const parseList = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  const totalPages = Math.ceil(satellites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSatellites = satellites.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Project Selector */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Satellite className="h-5 w-5" />
            Project Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="project">Select Project:</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Satellite className="h-8 w-8 text-blue-600" />
            Satellite Management
          </h2>
          <p className="text-muted-foreground">
            Manage satellite information, services, and equipment assignments
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleAddWithSteps}
            disabled={!selectedProject}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add with Steps
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleAdd}
                disabled={!selectedProject}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Quick Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
                <DialogTitle>
                  {editingSatellite ? "Edit Satellite" : "Add New Satellite"}
                </DialogTitle>
                <DialogDescription>
                  Configure satellite information and associated equipment
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Satellite Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., ASTRA 2E/2F/2G"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position || ""}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g., 28.2°E"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age/Status</Label>
                  <Input
                    id="age"
                    value={formData.age || ""}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g., Active since 2010"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direction">Direction</Label>
                  <Select
                    value={formData.direction || ""}
                    onValueChange={(value) => setFormData({ ...formData, direction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {directions.map((dir) => (
                        <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="services">Services (comma-separated)</Label>
                  <Textarea
                    id="services"
                    value={formData.services?.join(', ') || ""}
                    onChange={(e) => setFormData({ ...formData, services: parseList(e.target.value) })}
                    placeholder="e.g., BBC, ITV, Sky Sports, Channel 4"
                    rows={3}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="carriers">Carriers (comma-separated)</Label>
                  <Textarea
                    id="carriers"
                    value={formData.carriers?.join(', ') || ""}
                    onChange={(e) => setFormData({ ...formData, carriers: parseList(e.target.value) })}
                    placeholder="e.g., Sky, Freesat, BBC"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lnbCount">Connected LNBs</Label>
                  <Input
                    id="lnbCount"
                    type="number"
                    value={formData.lnbCount || 0}
                    onChange={(e) => setFormData({ ...formData, lnbCount: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="switchCount">Connected Switches</Label>
                  <Input
                    id="switchCount"
                    type="number"
                    value={formData.switchCount || 0}
                    onChange={(e) => setFormData({ ...formData, switchCount: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motorCount">Connected Motors</Label>
                  <Input
                    id="motorCount"
                    type="number"
                    value={formData.motorCount || 0}
                    onChange={(e) => setFormData({ ...formData, motorCount: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unicableCount">Connected Unicables</Label>
                  <Input
                    id="unicableCount"
                    type="number"
                    value={formData.unicableCount || 0}
                    onChange={(e) => setFormData({ ...formData, unicableCount: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingSatellite ? "Update" : "Add"} Satellite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {!selectedProject ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Please select a project to view satellites</p>
            </CardContent>
          </Card>
        ) : paginatedSatellites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No satellites found in this project</p>
            </CardContent>
          </Card>
        ) : (
          paginatedSatellites.map((satellite) => (
            <Card key={satellite.id} className="shadow-card animate-scale-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Satellite className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{satellite.name}</CardTitle>
                      <CardDescription>
                        Position: {satellite.position} • Direction: {satellite.direction}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(satellite)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(satellite.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Info className="w-4 h-4 mr-2 text-primary" />
                        Information
                      </h4>
                      <p className="text-sm text-muted-foreground">{satellite.age}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {satellite.services.map((service, index) => (
                          <Badge key={index} variant="outline">{service}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Carriers</h4>
                      <div className="flex flex-wrap gap-2">
                        {satellite.carriers.map((carrier, index) => (
                          <Badge key={index} variant="secondary">{carrier}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Connected Equipment</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{satellite.lnbCount}</div>
                        <div className="text-sm text-muted-foreground">LNBs</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{satellite.switchCount}</div>
                        <div className="text-sm text-muted-foreground">Switches</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{satellite.motorCount}</div>
                        <div className="text-sm text-muted-foreground">Motors</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-pink-600">{satellite.unicableCount}</div>
                        <div className="text-sm text-muted-foreground">Unicables</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {satellites.length > itemsPerPage && (
        <PaginationCustom
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Step Form Dialog */}
      <SatelliteStepForm
        isOpen={isStepFormOpen}
        onClose={() => setIsStepFormOpen(false)}
        projectId={selectedProject}
        username={username}
        onSave={loadSatellites}
      />
    </div>
  );
};

export default SatelliteManagement;