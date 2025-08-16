import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaginationCustom } from "@/components/ui/pagination-custom";
import { storageService } from "@/services/storageService";

interface MotorDevice {
  id: string;
  name: string;
  type: string;
  position: string;
  status: string;
}

interface MotorManagementProps {
  username: string;
}

const MotorManagement = ({ username }: MotorManagementProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [devices, setDevices] = useState<MotorDevice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MotorDevice | null>(null);
  const [formData, setFormData] = useState<Partial<MotorDevice>>({});
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    const loadProjects = () => {
      const savedProjects = storageService.getProjects();
      setProjects(savedProjects);
      if (savedProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(savedProjects[0].id);
      }
    };
    loadProjects();
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      const motors = storageService.getEquipment("motors", selectedProjectId);
      // Convert Equipment to MotorDevice format
      const motorDevices: MotorDevice[] = motors.map(motor => ({
        id: motor.id,
        name: motor.name,
        type: motor.type,
        position: motor.position || "",
        status: motor.status || "Positioned"
      }));
      setDevices(motorDevices);
    }
  }, [selectedProjectId]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const project = storageService.saveProject({
      name: newProjectName,
      description: newProjectDescription,
      createdBy: username
    });
    
    setProjects([...projects, project]);
    setSelectedProjectId(project.id);
    setIsCreateProjectOpen(false);
    setNewProjectName("");
    setNewProjectDescription("");
    
    storageService.logActivity(username, "Project Created", `Created project: ${newProjectName}`, project.id);
    
    toast({
      title: "Project Created",
      description: `Project "${newProjectName}" has been created successfully.`,
    });
  };

  const motorTypes = ["DiSEqC 1.2", "DiSEqC 1.3", "USALS", "36V"];
  const statusOptions = ["Positioned", "Moving", "Error", "Calibrating"];

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (device: MotorDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const device = devices.find(d => d.id === id);
    
    storageService.deleteEquipment("motors", id);
    
    const updatedDevices = devices.filter(d => d.id !== id);
    setDevices(updatedDevices);
    
    storageService.logActivity(username, "Motor Deleted", `Deleted motor: ${device?.name}`, selectedProjectId);
    
    toast({
      title: "Motor Deleted",
      description: "The motor device has been successfully removed.",
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

    if (editingDevice) {
      const updatedDevice = { ...formData as MotorDevice };
      storageService.updateEquipment("motors", updatedDevice.id, updatedDevice);
      
      const updatedDevices = devices.map(d => d.id === editingDevice.id ? updatedDevice : d);
      setDevices(updatedDevices);
      
      storageService.logActivity(username, "Motor Updated", `Updated motor: ${formData.name}`, selectedProjectId);
      
      toast({
        title: "Motor Updated",
        description: "The motor device has been successfully updated.",
      });
    } else {
      const newDevice = {
        ...formData as MotorDevice,
        id: Date.now().toString(),
      };
      
      storageService.saveEquipment("motors", newDevice, selectedProjectId);
      setDevices([...devices, newDevice]);
      
      storageService.logActivity(username, "Motor Added", `Added new motor: ${formData.name}`, selectedProjectId);
      
      toast({
        title: "Motor Added",
        description: "The new motor device has been successfully added.",
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
      {/* Project Selector */}
      <Card className="sticky top-0 z-10 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-violet-700">Project Selection</CardTitle>
          <CardDescription>Select or create a project to manage motor devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="project-select" className="text-violet-700 font-medium">Current Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="border-violet-200 focus:border-violet-400">
                  <SelectValue placeholder="Select a project" />
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
            <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>Create a new project for your motor devices</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">Description</Label>
                    <Input
                      id="project-description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} className="bg-gradient-to-r from-violet-600 to-purple-600">
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Motor Management
          </h2>
          <p className="text-muted-foreground">
            Manage dish positioning motors and actuators
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Motor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
              <DialogTitle>
                {editingDevice ? "Edit Motor Device" : "Add New Motor Device"}
              </DialogTitle>
              <DialogDescription>
                Configure the motor specifications and position settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter motor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select motor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {motorTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Current Position</Label>
                <Input
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., 28.2°E or 13°E"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || ""}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-violet-600 to-purple-600">
                {editingDevice ? "Update" : "Add"} Motor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
        <CardHeader>
          <CardTitle className="text-violet-700">Motor Devices ({devices.length})</CardTitle>
          <CardDescription>
            Manage your dish positioning motors and actuators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No motor devices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-violet-50/50">
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.position}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          device.status === "Positioned" ? "default" : 
                          device.status === "Error" ? "destructive" : 
                          device.status === "Moving" ? "secondary" :
                          "outline"
                        }
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(device)}
                          className="text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(device.id)}
                          className="text-destructive hover:text-destructive hover:bg-red-50"
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

export default MotorManagement;