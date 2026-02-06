import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Activity, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";
import InlineFormField from "@/components/InlineFormField";

interface IFSlot {
  slotNumber: number;
  frequency: string;
}

interface UnicableDevice {
  id: string;
  unicableType: string;
  status: string;
  port: string;
  ifSlots: IFSlot[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const unicableTypes = ["DSCR", "DCSS"];
  const statusOptions = ["ON", "OFF"];
  const portOptions = ["None", "A", "B"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('unicables');
      const unicableDevices: UnicableDevice[] = allDevices.map(device => ({
        id: device.id,
        unicableType: device.unicableType || "DSCR",
        status: device.status || "OFF",
        port: device.port || "None",
        ifSlots: Array.isArray(device.ifSlots) ? device.ifSlots : []
      }));
      setDevices(unicableDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({ unicableType: "DSCR", status: "OFF", port: "None", ifSlots: [] });
    setIsDialogOpen(true);
  };

  const handleEdit = (device: UnicableDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('unicables', id);
      await apiService.logActivity(username, "Unicable Deleted", `Deleted unicable: ${device?.unicableType}`, 'global');
      
      loadDevices();
      toast({
        title: "Unicable Deleted",
        description: "The unicable device has been successfully removed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.unicableType) {
      toast({
        title: "Validation Error",
        description: "Unicable Type is required.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddSlot = () => {
    const currentSlots = formData.ifSlots || [];
    if (currentSlots.length >= 32) {
      toast({ title: "Limit Reached", description: "Maximum 32 slots allowed.", variant: "destructive" });
      return;
    }
    const nextSlotNumber = currentSlots.length + 1;
    setFormData({
      ...formData,
      ifSlots: [...currentSlots, { slotNumber: nextSlotNumber, frequency: "" }]
    });
  };

  const handleRemoveSlot = (index: number) => {
    const currentSlots = formData.ifSlots || [];
    const newSlots = currentSlots.filter((_, i) => i !== index).map((slot, i) => ({
      ...slot,
      slotNumber: i + 1
    }));
    setFormData({ ...formData, ifSlots: newSlots });
  };

  const handleSlotChange = (index: number, frequency: string) => {
    const currentSlots = [...(formData.ifSlots || [])];
    currentSlots[index] = { ...currentSlots[index], frequency };
    setFormData({ ...formData, ifSlots: currentSlots });
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const deviceData = {
        unicableType: formData.unicableType!,
        status: formData.status || "OFF",
        port: formData.unicableType === "DSCR" ? (formData.port || "None") : "",
        ifSlots: formData.ifSlots || []
      };

      if (editingDevice) {
        await apiService.updateEquipment('unicables', editingDevice.id, deviceData);
        await apiService.logActivity(username, "Unicable Updated", `Updated unicable: ${formData.unicableType}`, 'global');
        
        toast({
          title: "Unicable Updated",
          description: "The unicable device has been successfully updated.",
        });
      } else {
        await apiService.saveEquipment('unicables', deviceData);
        await apiService.logActivity(username, "Unicable Added", `Added new unicable: ${formData.unicableType}`, 'global');
        
        toast({
          title: "Unicable Added",
          description: "The new unicable device has been successfully added.",
        });
      }
      
      loadDevices();
      setIsDialogOpen(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'unicableType', label: 'Type', sortable: true },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === "ON" ? "default" : "secondary"}>{value}</Badge>
      )
    },
    { 
      key: 'port', 
      label: 'Port',
      render: (value: string, item: UnicableDevice) => (
        item.unicableType === "DSCR" ? <Badge variant="outline">{value || 'None'}</Badge> : <span className="text-muted-foreground">-</span>
      )
    },
    { 
      key: 'ifSlots', 
      label: 'IF Slots',
      render: (value: IFSlot[]) => (
        <Badge variant="secondary">{(value || []).length} slots</Badge>
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
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            Unicable Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all unicable systems
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Add Unicable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {editingDevice ? "Edit Unicable Device" : "Add New Unicable Device"}
              </DialogTitle>
              <DialogDescription>
                Configure unicable type and parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <InlineFormField label="Type" required>
                <Select
                  value={formData.unicableType || "DSCR"}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    unicableType: value,
                    port: value === "DCSS" ? "" : formData.port
                  })}
                >
                  <SelectTrigger><SelectValue placeholder="Select unicable type" /></SelectTrigger>
                  <SelectContent>
                    {unicableTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              
              <InlineFormField label="Status">
                <Select
                  value={formData.status || "OFF"}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              
              {formData.unicableType === "DSCR" && (
                <InlineFormField label="Port">
                  <Select
                    value={formData.port || "None"}
                    onValueChange={(value) => setFormData({ ...formData, port: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select port" /></SelectTrigger>
                    <SelectContent>
                      {portOptions.map((port) => (
                        <SelectItem key={port} value={port}>{port}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InlineFormField>
              )}
              
              <div className="space-y-2 pl-[132px]">
                <div className="flex items-center justify-between">
                  <Label>IF Frequency Slots ({(formData.ifSlots || []).length}/32)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddSlot}
                    disabled={(formData.ifSlots || []).length >= 32}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Slot
                  </Button>
                </div>
                
                {(formData.ifSlots || []).length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {formData.ifSlots?.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Label className="w-16 text-sm text-muted-foreground">Slot {slot.slotNumber}</Label>
                        <Input
                          value={slot.frequency}
                          onChange={(e) => handleSlotChange(index, e.target.value)}
                          placeholder="IF Frequency (MHz)"
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveSlot(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <>{editingDevice ? "Update" : "Add"} Unicable</>
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
              <span className="ml-2 text-muted-foreground">Loading Unicables...</span>
            </div>
          ) : (
            <EquipmentTable
              data={devices}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              itemsPerPage={20}
              searchPlaceholder="Search unicables..."
              emptyMessage="No unicable devices found. Click 'Add Unicable' to create one."
              colorScheme="blue"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnicableManagement;