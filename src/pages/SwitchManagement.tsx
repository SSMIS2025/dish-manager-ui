import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Zap, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface SwitchDevice {
  id: string;
  switchType: string;
  switchOptions: string[];
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
  const [newOption, setNewOption] = useState("");

  const switchTypes = ["Tone Burst", "DiSEqC 1.0", "DiSEqC 1.1"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('switches');
      const switchDevices: SwitchDevice[] = allDevices.map(device => ({
        id: device.id,
        switchType: device.switchType || "Tone Burst",
        switchOptions: Array.isArray(device.switchOptions) ? device.switchOptions : []
      }));
      setDevices(switchDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({ switchType: "Tone Burst", switchOptions: [] });
    setNewOption("");
    setIsDialogOpen(true);
  };

  const handleEdit = (device: SwitchDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setNewOption("");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('switches', id);
      await apiService.logActivity(username, "Switch Deleted", `Deleted switch: ${device?.switchType}`, 'global');
      
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
    if (!formData.switchType) {
      toast({
        title: "Validation Error",
        description: "Switch Type is required.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      const currentOptions = formData.switchOptions || [];
      setFormData({ ...formData, switchOptions: [...currentOptions, newOption.trim()] });
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = formData.switchOptions || [];
    setFormData({ ...formData, switchOptions: currentOptions.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const deviceData = {
        switchType: formData.switchType!,
        switchOptions: formData.switchOptions || []
      };

      if (editingDevice) {
        await apiService.updateEquipment('switches', editingDevice.id, deviceData);
        await apiService.logActivity(username, "Switch Updated", `Updated switch: ${formData.switchType}`, 'global');
        
        toast({
          title: "Switch Updated",
          description: "The switch device has been successfully updated.",
        });
      } else {
        await apiService.saveEquipment('switches', deviceData);
        await apiService.logActivity(username, "Switch Added", `Added new switch: ${formData.switchType}`, 'global');
        
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

  const columns = [
    { key: 'switchType', label: 'Switch Type', sortable: true },
    { 
      key: 'switchOptions', 
      label: 'Options',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).slice(0, 3).map((opt, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
          ))}
          {(value || []).length > 3 && (
            <Badge variant="outline" className="text-xs">+{value.length - 3} more</Badge>
          )}
        </div>
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
                <Label htmlFor="switchType">Switch Type *</Label>
                <Select
                  value={formData.switchType || ""}
                  onValueChange={(value) => setFormData({ ...formData, switchType: value })}
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
                <Label>Switch Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Enter option value"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {(formData.switchOptions || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.switchOptions?.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {opt}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveOption(i)} />
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Add custom option values for this switch type</p>
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