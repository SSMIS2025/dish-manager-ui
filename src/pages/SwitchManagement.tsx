import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Zap, Loader2, X, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";
import InlineFormField from "@/components/InlineFormField";

interface SwitchDevice {
  id: string;
  switchType: string;
  switchOptions: string[];
}

interface SwitchManagementProps {
  username: string;
  isAdmin?: boolean;
}

const SwitchManagement = ({ username, isAdmin = false }: SwitchManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<SwitchDevice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SwitchDevice | null>(null);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newOption, setNewOption] = useState("");

  // Admin: manage switch types
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const defaultSwitchTypes = ["Tone Burst", "DiSEqC 1.0", "DiSEqC 1.1"];
  const [switchTypes, setSwitchTypes] = useState<string[]>(defaultSwitchTypes);

  useEffect(() => {
    loadDevices();
    loadCustomTypes();
  }, []);

  const loadCustomTypes = () => {
    const custom = apiService.getCustomTypes('switch_type');
    setSwitchTypes([...defaultSwitchTypes, ...custom]);
  };

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('switches');
      const switchDevices: SwitchDevice[] = allDevices.map(device => {
        let opts = device.switchOptions;
        if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = []; } }
        return {
          id: device.id,
          switchType: device.switchType || "Tone Burst",
          switchOptions: Array.isArray(opts) ? opts : []
        };
      });
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
    setFormData({ ...device });
    setNewOption("");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('switches', id);
      await apiService.logActivity(username, "Switch Deleted", `Deleted switch: ${device?.switchType}`, 'global');
      await loadDevices();
      toast({ title: "Switch Deleted", description: "The switch device has been successfully removed." });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.switchType) {
      toast({ title: "Validation Error", description: "Switch Type is required.", variant: "destructive" });
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

  // Admin: add new switch type
  const handleAddSwitchType = () => {
    if (!newTypeName.trim()) return;
    const added = apiService.addCustomType('switch_type', newTypeName.trim());
    if (added) {
      loadCustomTypes();
      setNewTypeName("");
      toast({ title: "Switch Type Added", description: `"${newTypeName.trim()}" has been added.` });
    } else {
      toast({ title: "Duplicate", description: "This switch type already exists.", variant: "destructive" });
    }
  };

  const handleDeleteSwitchType = (value: string) => {
    apiService.deleteCustomType('switch_type', value);
    loadCustomTypes();
    toast({ title: "Switch Type Removed" });
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Check duplicate by type + options
      const isDuplicate = await apiService.checkDuplicateByFields('switches', {
        switchType: formData.switchType!,
      }, editingDevice?.id);

      if (isDuplicate) {
        toast({ title: "Duplicate Entry", description: "A switch with this type already exists.", variant: "destructive" });
        return;
      }

      const deviceData = {
        switchType: formData.switchType!,
        switchOptions: formData.switchOptions || []
      };

      if (editingDevice) {
        await apiService.updateEquipment('switches', editingDevice.id, deviceData);
        await apiService.logActivity(username, "Switch Updated", `Updated switch: ${formData.switchType}`, 'global');
        toast({ title: "Switch Updated", description: "The switch device has been successfully updated." });
      } else {
        await apiService.saveEquipment('switches', deviceData);
        await apiService.logActivity(username, "Switch Added", `Added new switch: ${formData.switchType}`, 'global');
        toast({ title: "Switch Added", description: "The new switch device has been successfully added." });
      }
      
      await loadDevices();
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
      render: (value: string[]) => {
        const opts = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1">
            {opts.slice(0, 3).map((opt, i) => <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>)}
            {opts.length > 3 && <Badge variant="outline" className="text-xs">+{opts.length - 3} more</Badge>}
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            Switch Management
          </h2>
          <p className="text-muted-foreground mt-1">Global bucket - Manage all DiSEqC switches</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Types
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Manage Switch Types</DialogTitle>
                  <DialogDescription>Add or remove custom switch types (admin only)</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="flex gap-2">
                    <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="New switch type name" onKeyDown={(e) => e.key === 'Enter' && handleAddSwitchType()} />
                    <Button size="sm" onClick={handleAddSwitchType}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Custom Types</Label>
                    {apiService.getCustomTypes('switch_type').map((t) => (
                      <div key={t} className="flex items-center justify-between py-1 px-2 rounded bg-muted/50">
                        <span className="text-sm">{t}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteSwitchType(t)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {apiService.getCustomTypes('switch_type').length === 0 && <p className="text-xs text-muted-foreground">No custom types added</p>}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
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
                <DialogDescription>Configure switch type and configuration</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <InlineFormField label="Switch Type" required>
                  <Select value={formData.switchType || ""} onValueChange={(v) => setFormData({ ...formData, switchType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select switch type" /></SelectTrigger>
                    <SelectContent>
                      {switchTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </InlineFormField>
                
                <div className="space-y-2 pl-[132px]">
                  <Label>Switch Options</Label>
                  <div className="flex gap-2">
                    <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Enter option value" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())} />
                    <Button type="button" variant="outline" onClick={handleAddOption}><Plus className="h-4 w-4" /></Button>
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <>{editingDevice ? "Update" : "Add"} Switch</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
