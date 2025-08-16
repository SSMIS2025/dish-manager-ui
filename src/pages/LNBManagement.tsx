import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Radio, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface LNBDevice {
  id: string;
  name: string;
  type: string;
  frequency: string;
  polarization: string;
  skew: string;
  band: string;
  noiseFigure: string;
  localOscillator: string;
  gain: string;
  testResult: string;
}

interface LNBManagementProps {
  username: string;
}

const LNBManagement = ({ username }: LNBManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<LNBDevice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<LNBDevice | null>(null);
  const [formData, setFormData] = useState<Partial<LNBDevice>>({});

  const lnbTypes = ["Universal", "Single", "Twin", "Quad", "Octo"];
  const bands = ["C-Band", "Ku-Band", "Ka-Band", "L-Band"];
  const polarizations = ["Horizontal", "Vertical", "Circular"];

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
      const projectDevices = storageService.getEquipment('lnbs', selectedProject);
      // Transform Equipment to LNBDevice
      const lnbDevices: LNBDevice[] = projectDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        frequency: device.frequency || "",
        polarization: device.polarization || "",
        skew: device.skew || "",
        band: device.band || "",
        noiseFigure: device.noiseFigure || "",
        localOscillator: device.localOscillator || "",
        gain: device.gain || "",
        testResult: device.testResult || "Not Tested"
      }));
      setDevices(lnbDevices);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (device: LNBDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const device = devices.find(d => d.id === id);
    storageService.deleteEquipment('lnbs', id);
    storageService.logActivity(username, "LNB Deleted", `Deleted LNB: ${device?.name}`, selectedProject);
    
    loadDevices();
    toast({
      title: "LNB Deleted",
      description: "The LNB device has been successfully removed.",
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
      frequency: formData.frequency || "",
      polarization: formData.polarization || "",
      skew: formData.skew || "",
      band: formData.band || "",
      noiseFigure: formData.noiseFigure || "",
      localOscillator: formData.localOscillator || "",
      gain: formData.gain || "",
      testResult: formData.testResult || "Not Tested"
    } as Omit<LNBDevice, 'id'>;

    if (editingDevice) {
      storageService.updateEquipment('lnbs', editingDevice.id, deviceData);
      storageService.logActivity(username, "LNB Updated", `Updated LNB: ${formData.name}`, selectedProject);
      
      toast({
        title: "LNB Updated",
        description: "The LNB device has been successfully updated.",
      });
    } else {
      storageService.saveEquipment('lnbs', { ...deviceData, type: 'lnb' }, selectedProject);
      storageService.logActivity(username, "LNB Added", `Added new LNB: ${formData.name}`, selectedProject);
      
      toast({
        title: "LNB Added",
        description: "The new LNB device has been successfully added.",
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
      <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Radio className="h-5 w-5" />
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
            <Radio className="h-8 w-8 text-green-600" />
            LNB Management
          </h2>
          <p className="text-muted-foreground">
            Manage Low Noise Block downconverters for satellite reception
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              disabled={!selectedProject}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add LNB
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
              <DialogTitle>
                {editingDevice ? "Edit LNB Device" : "Add New LNB Device"}
              </DialogTitle>
              <DialogDescription>
                Configure LNB specifications and technical parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Universal Ku-Band LNB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">LNB Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LNB type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lnbTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  placeholder="e.g., 10.7-12.75 GHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="band">Band</Label>
                <Select
                  value={formData.band || ""}
                  onValueChange={(value) => setFormData({ ...formData, band: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select band" />
                  </SelectTrigger>
                  <SelectContent>
                    {bands.map((band) => (
                      <SelectItem key={band} value={band}>{band}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="polarization">Polarization</Label>
                <Select
                  value={formData.polarization || ""}
                  onValueChange={(value) => setFormData({ ...formData, polarization: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select polarization" />
                  </SelectTrigger>
                  <SelectContent>
                    {polarizations.map((pol) => (
                      <SelectItem key={pol} value={pol}>{pol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skew">Skew</Label>
                <Input
                  id="skew"
                  value={formData.skew || ""}
                  onChange={(e) => setFormData({ ...formData, skew: e.target.value })}
                  placeholder="e.g., 0°"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noiseFigure">Noise Figure</Label>
                <Input
                  id="noiseFigure"
                  value={formData.noiseFigure || ""}
                  onChange={(e) => setFormData({ ...formData, noiseFigure: e.target.value })}
                  placeholder="e.g., 0.1 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localOscillator">Local Oscillator</Label>
                <Input
                  id="localOscillator"
                  value={formData.localOscillator || ""}
                  onChange={(e) => setFormData({ ...formData, localOscillator: e.target.value })}
                  placeholder="e.g., 9.75/10.6 GHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gain">Gain</Label>
                <Input
                  id="gain"
                  value={formData.gain || ""}
                  onChange={(e) => setFormData({ ...formData, gain: e.target.value })}
                  placeholder="e.g., 60 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testResult">Test Result</Label>
                <Select
                  value={formData.testResult || "Not Tested"}
                  onValueChange={(value) => setFormData({ ...formData, testResult: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Not Tested">Not Tested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDevice ? "Update" : "Add"} LNB
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {!selectedProject ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Please select a project to view LNB devices</p>
            </CardContent>
          </Card>
        ) : paginatedDevices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No LNB devices found in this project</p>
            </CardContent>
          </Card>
        ) : (
          paginatedDevices.map((device) => (
            <Card key={device.id} className="shadow-card animate-scale-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{device.name}</CardTitle>
                      <CardDescription>
                        Type: {device.type} • Band: {device.band || "Not specified"}
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
                          <span className="text-muted-foreground">Frequency:</span>
                          <span>{device.frequency || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Polarization:</span>
                          <span>{device.polarization || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Skew:</span>
                          <span>{device.skew || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Noise Figure:</span>
                          <span>{device.noiseFigure || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Local Oscillator:</span>
                          <span>{device.localOscillator || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gain:</span>
                          <span>{device.gain || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Test Status:</span>
                          <Badge 
                            variant={
                              device.testResult === "Passed" ? "default" : 
                              device.testResult === "Failed" ? "destructive" : 
                              "secondary"
                            }
                          >
                            {device.testResult || "Not Tested"}
                          </Badge>
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

export default LNBManagement;