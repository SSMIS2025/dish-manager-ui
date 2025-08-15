import { useState } from "react";
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
import ProjectSelector from "@/components/ProjectSelector";
import { useProject } from "@/contexts/ProjectContext";
import { PaginationCustom } from "@/components/ui/pagination-custom";

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
  const { currentProject, updateProject, logActivity } = useProject();
  const [devices, setDevices] = useState<MotorDevice[]>(currentProject?.equipment.motors || []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MotorDevice | null>(null);
  const [formData, setFormData] = useState<Partial<MotorDevice>>({});

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
    const updatedDevices = devices.filter(d => d.id !== id);
    setDevices(updatedDevices);
    
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        equipment: { ...currentProject.equipment, motors: updatedDevices }
      };
      updateProject(updatedProject);
      logActivity(username, "Motor Deleted", `Deleted motor: ${device?.name}`, currentProject.id);
    }
    
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

    let updatedDevices;
    if (editingDevice) {
      updatedDevices = devices.map(d => d.id === editingDevice.id ? { ...formData as MotorDevice } : d);
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, motors: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "Motor Updated", `Updated motor: ${formData.name}`, currentProject.id);
      }
      
      toast({
        title: "Motor Updated",
        description: "The motor device has been successfully updated.",
      });
    } else {
      const newDevice = {
        ...formData as MotorDevice,
        id: Date.now().toString(),
      };
      updatedDevices = [...devices, newDevice];
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, motors: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "Motor Added", `Added new motor: ${formData.name}`, currentProject.id);
      }
      
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
      <ProjectSelector username={username} isAdmin={false} />
      
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
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Motor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
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
              <Button onClick={handleSave}>
                {editingDevice ? "Update" : "Add"} Motor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motor Devices ({devices.length})</CardTitle>
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
                  <TableRow key={device.id}>
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

export default MotorManagement;