import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SwitchDevice | null>(null);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({});

  const switchTypes = ["DiSEqC 1.0", "DiSEqC 1.1", "DiSEqC 2.0", "22kHz Tone", "Voltage Controlled"];
  const protocols = ["DiSEqC", "22kHz", "Voltage", "Manual"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const allDevices = await apiService.getEquipment('switches');
    const switchDevices: SwitchDevice[] = allDevices.map(device => ({
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

  const handleDelete = async (id: string) => {
    const device = devices.find(d => d.id === id);
    await apiService.deleteEquipment('switches', id);
    await apiService.logActivity(username, "Switch Deleted", `Deleted switch: ${device?.name}`, 'global');
    
    loadDevices();
    toast({
      title: "Switch Deleted",
      description: "The switch device has been successfully removed.",
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
    const isDuplicate = await apiService.checkDuplicate('switches', formData.name!, editingDevice?.id);
    if (isDuplicate) {
      toast({
        title: "Duplicate Entry",
        description: "A switch with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    const deviceData = {
      name: formData.name,
      type: formData.type,
      ports: formData.ports || 2,
      frequency: formData.frequency || "",
      isolation: formData.isolation || "",
      insertionLoss: formData.insertionLoss || "",
      protocol: formData.protocol || "",
      powerConsumption: formData.powerConsumption || ""
    };

    if (editingDevice) {
      await apiService.updateEquipment('switches', editingDevice.id, deviceData);
      await apiService.logActivity(username, "Switch Updated", `Updated switch: ${formData.name}`, 'global');
      
      toast({
        title: "Switch Updated",
        description: "The switch device has been successfully updated.",
      });
    } else {
      await apiService.saveEquipment('switches', deviceData);
      await apiService.logActivity(username, "Switch Added", `Added new switch: ${formData.name}`, 'global');
      
      toast({
        title: "Switch Added",
        description: "The new switch device has been successfully added.",
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
      key: 'ports', 
      label: 'Ports',
      render: (value: number) => <Badge variant="secondary">{value}</Badge>
    },
    { key: 'protocol', label: 'Protocol', sortable: true },
    { key: 'frequency', label: 'Frequency' },
    { key: 'isolation', label: 'Isolation' },
    { key: 'powerConsumption', label: 'Power' }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            Switch Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all DiSEqC switches and signal distribution equipment
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Switch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
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
              <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-orange-600">
                {editingDevice ? "Update" : "Add"} Switch
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
            searchPlaceholder="Search switches..."
            emptyMessage="No switch devices found. Click 'Add Switch' to create one."
            colorScheme="orange"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SwitchManagement;
