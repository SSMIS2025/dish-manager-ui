import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Zap, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface SwitchDevice {
  id: string;
  name: string;
  type: string;
  ports: number;
  frequency: string;
  isolation: string;
  insertionLoss: string;
  protocol: string;
  powerConsumption: string;
}

interface SwitchManagementProps {
  username: string;
}

const SwitchManagement = ({ username }: SwitchManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<SwitchDevice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SwitchDevice | null>(null);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({});

  const switchTypes = ["DiSEqC 1.0", "DiSEqC 1.1", "DiSEqC 2.0", "22kHz Tone", "Voltage Controlled"];
  const protocols = ["DiSEqC", "22kHz", "Voltage", "Manual"];

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
      const projectDevices = storageService.getEquipment('switches', selectedProject);
      const switchDevices: SwitchDevice[] = projectDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        ports: device.ports || 2,
        frequency: device.frequency || "",
        isolation: device.isolation || "",
        insertionLoss: device.insertionLoss || "",
        protocol: device.protocol || "",
        powerConsumption: device.powerConsumption || ""
      }));
      setDevices(switchDevices);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (device: SwitchDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const device = devices.find(d => d.id === id);
    storageService.deleteEquipment('switches', id);
    storageService.logActivity(username, "Switch Deleted", `Deleted switch: ${device?.name}`, selectedProject);
    
    loadDevices();
    toast({
      title: "Switch Deleted",
      description: "The switch device has been successfully removed.",
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
      ports: formData.ports || 2,
      frequency: formData.frequency || "",
      isolation: formData.isolation || "",
      insertionLoss: formData.insertionLoss || "",
      protocol: formData.protocol || "",
      powerConsumption: formData.powerConsumption || ""
    } as Omit<SwitchDevice, 'id'>;

    if (editingDevice) {
      storageService.updateEquipment('switches', editingDevice.id, deviceData);
      storageService.logActivity(username, "Switch Updated", `Updated switch: ${formData.name}`, selectedProject);
      
      toast({
        title: "Switch Updated",
        description: "The switch device has been successfully updated.",
      });
    } else {
      storageService.saveEquipment('switches', { ...deviceData, type: 'switch' }, selectedProject);
      storageService.logActivity(username, "Switch Added", `Added new switch: ${formData.name}`, selectedProject);
      
      toast({
        title: "Switch Added",
        description: "The new switch device has been successfully added.",
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
      <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Zap className="h-5 w-5" />
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
            <Zap className="h-8 w-8 text-orange-600" />
            Switch Management
          </h2>
          <p className="text-muted-foreground">
            Manage DiSEqC switches and signal distribution equipment
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              disabled={!selectedProject}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Switch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
              <DialogTitle>
                {editingDevice ? "Edit Switch Device" : "Add New Switch Device"}
              </DialogTitle>
              <DialogDescription>
                Configure switch specifications and connection parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 4x1 DiSEqC Switch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Switch Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select switch type" />
                  </SelectTrigger>
                  <SelectContent>
                    {switchTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ports">Number of Ports</Label>
                <Input
                  id="ports"
                  type="number"
                  value={formData.ports || 2}
                  onChange={(e) => setFormData({ ...formData, ports: parseInt(e.target.value) || 2 })}
                  min="2"
                  max="16"
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
                  placeholder="e.g., 950-2150 MHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isolation">Isolation</Label>
                <Input
                  id="isolation"
                  value={formData.isolation || ""}
                  onChange={(e) => setFormData({ ...formData, isolation: e.target.value })}
                  placeholder="e.g., 30 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insertionLoss">Insertion Loss</Label>
                <Input
                  id="insertionLoss"
                  value={formData.insertionLoss || ""}
                  onChange={(e) => setFormData({ ...formData, insertionLoss: e.target.value })}
                  placeholder="e.g., 1.5 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="powerConsumption">Power Consumption</Label>
                <Input
                  id="powerConsumption"
                  value={formData.powerConsumption || ""}
                  onChange={(e) => setFormData({ ...formData, powerConsumption: e.target.value })}
                  placeholder="e.g., 50 mA"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDevice ? "Update" : "Add"} Switch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {!selectedProject ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Please select a project to view switch devices</p>
            </CardContent>
          </Card>
        ) : paginatedDevices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No switch devices found in this project</p>
            </CardContent>
          </Card>
        ) : (
          paginatedDevices.map((device) => (
            <Card key={device.id} className="shadow-card animate-scale-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{device.name}</CardTitle>
                      <CardDescription>
                        Type: {device.type} • Ports: {device.ports}
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
                          <span className="text-muted-foreground">Isolation:</span>
                          <span>{device.isolation || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insertion Loss:</span>
                          <span>{device.insertionLoss || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Ports:</span>
                          <Badge variant="secondary">{device.ports}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Power Consumption:</span>
                          <span>{device.powerConsumption || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="default">Active</Badge>
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

export default SwitchManagement;