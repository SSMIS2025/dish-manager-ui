import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProjectSelector from "@/components/ProjectSelector";
import { useProject } from "@/contexts/ProjectContext";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface LNBDevice {
  id: string;
  type: string;
  name: string;
  frequency: string;
  test: string;
  age: string;
  make: string;
  model: string;
  gain: string;
  noiseFigure: string;
  polarization: string;
}

interface LNBManagementProps {
  username: string;
}

const LNBManagement = ({ username }: LNBManagementProps) => {
  const { toast } = useToast();
  const { currentProject, updateProject, logActivity } = useProject();
  const [devices, setDevices] = useState<LNBDevice[]>(currentProject?.equipment.lnbs || []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<LNBDevice | null>(null);
  const [formData, setFormData] = useState<Partial<LNBDevice>>({});

  const lnbTypes = ["Universal", "Single", "Twin", "Quad", "Octo"];
  const testResults = ["Pass", "Fail", "Pending", "Not Tested"];
  const makes = ["Inverto", "Technomate", "Golden Media", "Triax", "Sharp"];
  const polarizations = ["Linear", "Circular", "Dual"];

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
    const updatedDevices = devices.filter(d => d.id !== id);
    setDevices(updatedDevices);
    
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        equipment: { ...currentProject.equipment, lnbs: updatedDevices }
      };
      updateProject(updatedProject);
      logActivity(username, "LNB Deleted", `Deleted LNB: ${device?.name}`, currentProject.id);
    }
    
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

    let updatedDevices;
    if (editingDevice) {
      updatedDevices = devices.map(d => d.id === editingDevice.id ? { ...formData as LNBDevice } : d);
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, lnbs: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "LNB Updated", `Updated LNB: ${formData.name}`, currentProject.id);
      }
      
      toast({
        title: "LNB Updated",
        description: "The LNB device has been successfully updated.",
      });
    } else {
      const newDevice = {
        ...formData as LNBDevice,
        id: Date.now().toString(),
      };
      updatedDevices = [...devices, newDevice];
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, lnbs: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "LNB Added", `Added new LNB: ${formData.name}`, currentProject.id);
      }
      
      toast({
        title: "LNB Added",
        description: "The new LNB device has been successfully added.",
      });
    }
    
    setIsDialogOpen(false);
    setFormData({});
  };

  const totalPages = Math.ceil(devices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = devices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <ProjectSelector username={username} isAdmin={false} />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Radio className="h-8 w-8 text-primary" />
            LNB Management
          </h2>
          <p className="text-muted-foreground">
            Manage Low Noise Block converters and their specifications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add LNB
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDevice ? "Edit LNB Device" : "Add New LNB Device"}
              </DialogTitle>
              <DialogDescription>
                Configure the LNB specifications and parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
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
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter LNB name"
                />
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
                <Label htmlFor="test">Test Result</Label>
                <Select
                  value={formData.test || ""}
                  onValueChange={(value) => setFormData({ ...formData, test: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select test result" />
                  </SelectTrigger>
                  <SelectContent>
                    {testResults.map((result) => (
                      <SelectItem key={result} value={result}>{result}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g., 2 years"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Select
                  value={formData.make || ""}
                  onValueChange={(value) => setFormData({ ...formData, make: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes.map((make) => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model || ""}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Enter model number"
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
                <Label htmlFor="noiseFigure">Noise Figure</Label>
                <Input
                  id="noiseFigure"
                  value={formData.noiseFigure || ""}
                  onChange={(e) => setFormData({ ...formData, noiseFigure: e.target.value })}
                  placeholder="e.g., 0.2 dB"
                />
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
            </div>
            <div className="flex justify-end space-x-2">
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

      <Card>
        <CardHeader>
          <CardTitle>LNB Devices ({devices.length})</CardTitle>
          <CardDescription>
            Manage your Low Noise Block converter inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Test Status</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No LNB devices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.frequency}</TableCell>
                    <TableCell>{device.make}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={device.test === "Pass" ? "default" : device.test === "Fail" ? "destructive" : "secondary"}
                      >
                        {device.test}
                      </Badge>
                    </TableCell>
                    <TableCell>{device.age}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {devices.length > itemsPerPage && (
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

export default LNBManagement;