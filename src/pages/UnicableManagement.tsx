import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Router } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProjectSelector from "@/components/ProjectSelector";
import { useProject } from "@/contexts/ProjectContext";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface UnicableDevice {
  id: string;
  name: string;
  type: string;
  frequency: string;
  status: string;
}

interface UnicableManagementProps {
  username: string;
}

const UnicableManagement = ({ username }: UnicableManagementProps) => {
  const { toast } = useToast();
  const { currentProject, updateProject, logActivity } = useProject();
  const [devices, setDevices] = useState<UnicableDevice[]>(currentProject?.equipment.unicables || []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<UnicableDevice | null>(null);
  const [formData, setFormData] = useState<Partial<UnicableDevice>>({});

  const unicableTypes = ["EN50494", "EN50607", "JESS", "dSCR"];
  const statusOptions = ["Active", "Inactive", "Error", "Configuration"];

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
    const updatedDevices = devices.filter(d => d.id !== id);
    setDevices(updatedDevices);
    
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        equipment: { ...currentProject.equipment, unicables: updatedDevices }
      };
      updateProject(updatedProject);
      logActivity(username, "Unicable Deleted", `Deleted unicable: ${device?.name}`, currentProject.id);
    }
    
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

    let updatedDevices;
    if (editingDevice) {
      updatedDevices = devices.map(d => d.id === editingDevice.id ? { ...formData as UnicableDevice } : d);
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, unicables: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "Unicable Updated", `Updated unicable: ${formData.name}`, currentProject.id);
      }
      
      toast({
        title: "Unicable Updated",
        description: "The unicable device has been successfully updated.",
      });
    } else {
      const newDevice = {
        ...formData as UnicableDevice,
        id: Date.now().toString(),
      };
      updatedDevices = [...devices, newDevice];
      setDevices(updatedDevices);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          equipment: { ...currentProject.equipment, unicables: updatedDevices }
        };
        updateProject(updatedProject);
        logActivity(username, "Unicable Added", `Added new unicable: ${formData.name}`, currentProject.id);
      }
      
      toast({
        title: "Unicable Added",
        description: "The new unicable device has been successfully added.",
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
            <Router className="h-8 w-8 text-primary" />
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
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unicable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingDevice ? "Edit Unicable Device" : "Add New Unicable Device"}
              </DialogTitle>
              <DialogDescription>
                Configure the unicable specifications and frequency settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter unicable name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
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
                <Label htmlFor="frequency">User Band Frequency</Label>
                <Input
                  id="frequency"
                  value={formData.frequency || ""}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., 1284 MHz"
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
                {editingDevice ? "Update" : "Add"} Unicable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unicable Devices ({devices.length})</CardTitle>
          <CardDescription>
            Manage your unicable systems and single cable distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User Band Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No unicable devices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.frequency}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          device.status === "Active" ? "default" : 
                          device.status === "Error" ? "destructive" : 
                          "secondary"
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

export default UnicableManagement;