import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface SwitchDevice {
  id: string;
  name: string;
  switchType: string;
  switchConfiguration: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const nameRef = useRef<HTMLInputElement>(null);

  const switchTypes = ["Dis1", "Dis2"];
  
  // Configuration options based on switch type
  const dis1Configurations = ["123", "42", "56", "66", "78", "88"];
  const dis2Configurations = ["1", "2", "3", "4", "5", "6", "7", "8"];

  const getConfigurationOptions = () => {
    return formData.switchType === "Dis1" ? dis1Configurations : dis2Configurations;
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('switches');
      const switchDevices: SwitchDevice[] = allDevices.map(device => ({
        id: device.id,
        name: device.name,
        switchType: device.switchType || device.type || "Dis1",
        switchConfiguration: device.switchConfiguration || ""
      }));
      setDevices(switchDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({ switchType: "Dis1" });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEdit = (device: SwitchDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('switches', id);
      await apiService.logActivity(username, "Switch Deleted", `Deleted switch: ${device?.name}`, 'global');
      
      loadDevices();
      toast({
        title: "Switch Deleted",
        description: "The switch device has been successfully removed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Device name is required.",
        variant: "destructive",
      });
      nameRef.current?.focus();
      return false;
    }

    if (!formData.switchType) {
      toast({
        title: "Validation Error",
        description: "Switch Type is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.switchConfiguration) {
      toast({
        title: "Validation Error",
        description: "Switch Configuration is required.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Check for duplicates
      const isDuplicate = await apiService.checkDuplicate('switches', formData.name!, editingDevice?.id);
      if (isDuplicate) {
        toast({
          title: "Duplicate Entry",
          description: "A switch with this name already exists.",
          variant: "destructive",
        });
        nameRef.current?.focus();
        return;
      }

      const deviceData = {
        name: formData.name!,
        type: formData.switchType!,
        switchType: formData.switchType!,
        switchConfiguration: formData.switchConfiguration!
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchTypeChange = (value: string) => {
    setFormData({ 
      ...formData, 
      switchType: value,
      switchConfiguration: "" // Reset configuration when type changes
    });
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'switchType', label: 'Switch Type', sortable: true },
    { 
      key: 'switchConfiguration', 
      label: 'Configuration',
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            Switch Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all DiSEqC switches
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Add Switch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {editingDevice ? "Edit Switch Device" : "Add New Switch Device"}
              </DialogTitle>
              <DialogDescription>
                Configure switch type and configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 4x1 DiSEqC Switch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="switchType">Switch Type *</Label>
                <Select
                  value={formData.switchType || ""}
                  onValueChange={handleSwitchTypeChange}
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
                <Label htmlFor="switchConfiguration">Switch Configuration *</Label>
                <Select
                  value={formData.switchConfiguration || ""}
                  onValueChange={(value) => setFormData({ ...formData, switchConfiguration: value })}
                  disabled={!formData.switchType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.switchType ? "Select configuration" : "Select switch type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getConfigurationOptions().map((config) => (
                      <SelectItem key={config} value={config}>{config}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.switchType === "Dis1" 
                    ? "Dis1 configurations: 123, 42, 56, 66, 78, 88" 
                    : formData.switchType === "Dis2" 
                    ? "Dis2 configurations: 1-8" 
                    : "Select a switch type to see available configurations"}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editingDevice ? "Update" : "Add"} Switch</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading Switches...</span>
            </div>
          ) : (
            <EquipmentTable
              data={devices}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              itemsPerPage={20}
              searchPlaceholder="Search switches..."
              emptyMessage="No switch devices found. Click 'Add Switch' to create one."
              colorScheme="blue"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SwitchManagement;