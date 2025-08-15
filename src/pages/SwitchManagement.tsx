import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SwitchDevice {
  id: string;
  name: string;
  type: string;
  ports: string;
  status: string;
  location: string;
}

const SwitchManagement = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<SwitchDevice[]>([
    {
      id: "1",
      name: "SW-001",
      type: "DiSEqC 1.0",
      ports: "4",
      status: "Active",
      location: "Main Dish"
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SwitchDevice | null>(null);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({});

  const switchTypes = ["DiSEqC 1.0", "DiSEqC 1.1", "DiSEqC 1.2", "22kHz", "Voltage"];
  const portOptions = ["2", "4", "8", "16"];
  const statusOptions = ["Active", "Inactive", "Error", "Maintenance"];

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
    setDevices(devices.filter(d => d.id !== id));
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

    if (editingDevice) {
      setDevices(devices.map(d => d.id === editingDevice.id ? { ...formData as SwitchDevice } : d));
      toast({
        title: "Switch Updated",
        description: "The switch device has been successfully updated.",
      });
    } else {
      const newDevice = {
        ...formData as SwitchDevice,
        id: Date.now().toString(),
      };
      setDevices([...devices, newDevice]);
      toast({
        title: "Switch Added",
        description: "The new switch device has been successfully added.",
      });
    }
    
    setIsDialogOpen(false);
    setFormData({});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Switch Management
          </h2>
          <p className="text-muted-foreground">
            Manage DiSEqC switches and signal routing devices
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Switch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingDevice ? "Edit Switch Device" : "Add New Switch Device"}
              </DialogTitle>
              <DialogDescription>
                Configure the switch specifications and settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter switch name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
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
                <Label htmlFor="ports">Ports</Label>
                <Select
                  value={formData.ports || ""}
                  onValueChange={(value) => setFormData({ ...formData, ports: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of ports" />
                  </SelectTrigger>
                  <SelectContent>
                    {portOptions.map((port) => (
                      <SelectItem key={port} value={port}>{port} ports</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter installation location"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Switch Devices ({devices.length})</CardTitle>
          <CardDescription>
            Manage your DiSEqC switches and signal routing equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>{device.ports}</TableCell>
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
                  <TableCell>{device.location}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SwitchManagement;