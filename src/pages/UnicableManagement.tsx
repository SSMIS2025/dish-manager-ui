import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Activity, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface UnicableDevice {
  id: string;
  name: string;
  type: string;
  userBands: number;
  frequency: string;
  protocol: string;
  powerConsumption: string;
  compatibility: string;
}

interface UnicableManagementProps {
  username: string;
}

const UnicableManagement = ({ username }: UnicableManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<UnicableDevice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<UnicableDevice | null>(null);
  const [formData, setFormData] = useState<Partial<UnicableDevice>>({});

  const unicableTypes = ["EN50494", "EN50607", "Legacy Unicable", "Hybrid LNB"];
  const protocols = ["Unicable I", "Unicable II", "Legacy", "Advanced"];

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadDevices();
    }
  }, [selectedProject]);

  const loadProjects = () => {
    const allProjects = storageService.getProjects();
    setProjects(allProjects);
    if (allProjects.length > 0 && !selectedProject) {
      setSelectedProject(allProjects[0].id);
    }
  };

  const loadDevices = () => {
    if (selectedProject) {
      const projectDevices = storageService.getEquipment('unicables', selectedProject);
      const unicableDevices: UnicableDevice[] = projectDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        userBands: device.userBands || 8,
        frequency: device.frequency || "",
        protocol: device.protocol || "",
        powerConsumption: device.powerConsumption || "",
        compatibility: device.compatibility || ""
      }));
      setDevices(unicableDevices);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (device: UnicableDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const device = devices.find(d => d.id === id);
    storageService.deleteEquipment('unicables', id);
    storageService.logActivity(username, "Unicable Deleted", `Deleted unicable: ${device?.name}`, selectedProject);
    
    loadDevices();
    toast({
      title: "Unicable Deleted",
      description: "The unicable device has been successfully removed.",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.type) {
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

    const deviceData = {
      ...formData,
      userBands: formData.userBands || 8,
      frequency: formData.frequency || "",
      protocol: formData.protocol || "",
      powerConsumption: formData.powerConsumption || "",
      compatibility: formData.compatibility || ""
    } as Omit<UnicableDevice, 'id'>;

    if (editingDevice) {
      storageService.updateEquipment('unicables', editingDevice.id, deviceData);
      storageService.logActivity(username, "Unicable Updated", `Updated unicable: ${formData.name}`, selectedProject);
      
      toast({
        title: "Unicable Updated",
        description: "The unicable device has been successfully updated.",
      });
    } else {
      storageService.saveEquipment('unicables', { ...deviceData, type: 'unicable' }, selectedProject);
      storageService.logActivity(username, "Unicable Added", `Added new unicable: ${formData.name}`, selectedProject);
      
      toast({
        title: "Unicable Added",
        description: "The new unicable device has been successfully added.",
      });
    }
    
    loadDevices();
    setIsDialogOpen(false);
    setFormData({});
  };

  const totalPages = Math.ceil(devices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = devices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Project Selector */}
      <Card className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 border-pink-200 dark:border-pink-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
            <Activity className="h-5 w-5" />
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
            <Activity className="h-8 w-8 text-pink-600" />
            Unicable Management
          </h2>
          <p className="text-muted-foreground">
            Manage Unicable systems and single cable distribution
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              disabled={!selectedProject}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unicable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
              <DialogTitle>
                {editingDevice ? "Edit Unicable Device" : "Add New Unicable Device"}
              </DialogTitle>
              <DialogDescription>
                Configure Unicable specifications and user band parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 8-User Unicable LNB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Unicable Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unicable type" />
                  </SelectTrigger>
                  <SelectContent>
                    {unicableTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userBands">User Bands</Label>
                <Input
                  id="userBands"
                  type="number"
                  value={formData.userBands || 8}
                  onChange={(e) => setFormData({ ...formData, userBands: parseInt(e.target.value) || 8 })}
                  min="2"
                  max="32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={formData.protocol || ""}
                  onValueChange={(value) => setFormData({ ...formData, protocol: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map((protocol) => (
                      <SelectItem key={protocol} value={protocol}>{protocol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency Range</Label>
                <Input
                  id="frequency"
                  value={formData.frequency || ""}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., 1210-1750 MHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="powerConsumption">Power Consumption</Label>
                <Input
                  id="powerConsumption"
                  value={formData.powerConsumption || ""}
                  onChange={(e) => setFormData({ ...formData, powerConsumption: e.target.value })}
                  placeholder="e.g., 150 mA"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="compatibility">Compatibility</Label>
                <Input
                  id="compatibility"
                  value={formData.compatibility || ""}
                  onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                  placeholder="e.g., EN50494, EN50607 compatible"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDevice ? "Update" : "Add"} Unicable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {!selectedProject ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Please select a project to view unicable devices</p>
            </CardContent>
          </Card>
        ) : paginatedDevices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No unicable devices found in this project</p>
            </CardContent>
          </Card>
        ) : (
          paginatedDevices.map((device) => (
            <Card key={device.id} className="shadow-card animate-scale-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{device.name}</CardTitle>
                      <CardDescription>
                        Type: {device.type} • User Bands: {device.userBands}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(device)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
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
                        Technical Specifications
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protocol:</span>
                          <span>{device.protocol || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Frequency:</span>
                          <span>{device.frequency || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Power Consumption:</span>
                          <span>{device.powerConsumption || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Compatibility:</span>
                          <span>{device.compatibility || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User Bands:</span>
                          <Badge variant="secondary">{device.userBands}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Standard:</span>
                          <span>{device.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {devices.length > itemsPerPage && (
        <PaginationCustom
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default UnicableManagement;