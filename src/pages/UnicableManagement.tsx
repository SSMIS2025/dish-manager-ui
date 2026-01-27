import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<UnicableDevice | null>(null);
  const [formData, setFormData] = useState<Partial<UnicableDevice>>({});

  const unicableTypes = ["Unicable I", "Unicable II (JESS)", "dCSS"];
  const protocols = ["EN 50494", "EN 50607", "Legacy"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const allDevices = await apiService.getEquipment('unicables');
    const unicableDevices: UnicableDevice[] = allDevices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      userBands: device.userBands || 1,
      frequency: device.frequency || "",
      protocol: device.protocol || "",
      powerConsumption: device.powerConsumption || "",
      compatibility: device.compatibility || ""
    }));
    setDevices(unicableDevices);
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

  const handleDelete = async (id: string) => {
    const device = devices.find(d => d.id === id);
    await apiService.deleteEquipment('unicables', id);
    await apiService.logActivity(username, "Unicable Deleted", `Deleted unicable: ${device?.name}`, 'global');
    
    loadDevices();
    toast({
      title: "Unicable Deleted",
      description: "The unicable device has been successfully removed.",
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const isDuplicate = await apiService.checkDuplicate('unicables', formData.name!, editingDevice?.id);
    if (isDuplicate) {
      toast({
        title: "Duplicate Entry",
        description: "A unicable with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    const deviceData = {
      name: formData.name,
      type: formData.type,
      userBands: formData.userBands || 1,
      frequency: formData.frequency || "",
      protocol: formData.protocol || "",
      powerConsumption: formData.powerConsumption || "",
      compatibility: formData.compatibility || ""
    };

    if (editingDevice) {
      await apiService.updateEquipment('unicables', editingDevice.id, deviceData);
      await apiService.logActivity(username, "Unicable Updated", `Updated unicable: ${formData.name}`, 'global');
      
      toast({
        title: "Unicable Updated",
        description: "The unicable device has been successfully updated.",
      });
    } else {
      await apiService.saveEquipment('unicables', deviceData);
      await apiService.logActivity(username, "Unicable Added", `Added new unicable: ${formData.name}`, 'global');
      
      toast({
        title: "Unicable Added",
        description: "The new unicable device has been successfully added.",
      });
    }
    
    loadDevices();
    setIsDialogOpen(false);
    setFormData({});
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { 
      key: 'userBands', 
      label: 'User Bands',
      render: (value: number) => <Badge variant="secondary">{value}</Badge>
    },
    { key: 'protocol', label: 'Protocol', sortable: true },
    { key: 'frequency', label: 'Frequency' },
    { key: 'powerConsumption', label: 'Power' },
    { key: 'compatibility', label: 'Compatibility' }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            Unicable Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all unicable systems
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unicable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-pink-600" />
                {editingDevice ? "Edit Unicable Device" : "Add New Unicable Device"}
              </DialogTitle>
              <DialogDescription>
                Configure unicable specifications and system parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Unicable II LNB"
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
                  value={formData.userBands || 1}
                  onChange={(e) => setFormData({ ...formData, userBands: parseInt(e.target.value) || 1 })}
                  min="1"
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
                  placeholder="e.g., 950-2150 MHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="powerConsumption">Power Consumption</Label>
                <Input
                  id="powerConsumption"
                  value={formData.powerConsumption || ""}
                  onChange={(e) => setFormData({ ...formData, powerConsumption: e.target.value })}
                  placeholder="e.g., 200 mA"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="compatibility">Compatibility</Label>
                <Input
                  id="compatibility"
                  value={formData.compatibility || ""}
                  onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                  placeholder="e.g., Compatible with Sky Q, Freesat"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-pink-500 to-pink-600">
                {editingDevice ? "Update" : "Add"} Unicable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          <EquipmentTable
            data={devices}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            itemsPerPage={20}
            searchPlaceholder="Search unicables..."
            emptyMessage="No unicable devices found. Click 'Add Unicable' to create one."
            colorScheme="pink"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UnicableManagement;
