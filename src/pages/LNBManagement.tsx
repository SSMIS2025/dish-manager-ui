import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Radio, Loader2, X, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";
import InlineFormField from "@/components/InlineFormField";

interface LNBDevice {
  id: string;
  name: string;
  bandType: string;
  powerControl: string;
  vControl: string;
  khzOption: string;
  lowFrequency: string;
  highFrequency: string;
  customFields: { key: string; value: string }[];
}

interface LNBManagementProps {
  username: string;
  isAdmin?: boolean;
}

const LNBManagement = ({ username, isAdmin = false }: LNBManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<LNBDevice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<LNBDevice | null>(null);
  const [formData, setFormData] = useState<Partial<LNBDevice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Admin: manage band types
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  
  const nameRef = useRef<HTMLInputElement>(null);

  const defaultBandTypes = ["NONE", "C-Band", "Ku-Band", "Ka-Band", "L-Band"];
  const [bandTypes, setBandTypes] = useState<string[]>(defaultBandTypes);
  const powerControls = ["NONE", "Auto", "13V", "18V", "Off"];
  const vControls = ["NONE", "Enabled", "Disabled"];
  const khzOptions = ["NONE", "Auto", "On", "Off"];

  const bandDefaults: Record<string, { lowFrequency: string; highFrequency: string }> = {
    "C-Band": { lowFrequency: "3400", highFrequency: "4200" },
    "Ku-Band": { lowFrequency: "10700", highFrequency: "12750" },
    "Ka-Band": { lowFrequency: "18300", highFrequency: "20200" },
    "L-Band": { lowFrequency: "950", highFrequency: "2150" },
    "NONE": { lowFrequency: "", highFrequency: "" },
  };

  const handleBandTypeChange = (value: string) => {
    const defaults = bandDefaults[value] || { lowFrequency: "", highFrequency: "" };
    setFormData({ ...formData, bandType: value, lowFrequency: defaults.lowFrequency, highFrequency: defaults.highFrequency });
  };

  useEffect(() => {
    loadDevices();
    loadCustomTypes();
  }, []);

  const loadCustomTypes = () => {
    const custom = apiService.getCustomTypes('lnb_band');
    setBandTypes([...defaultBandTypes, ...custom]);
  };

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('lnbs');
      const lnbDevices: LNBDevice[] = allDevices.map(device => ({
        id: device.id,
        name: device.name || "",
        bandType: device.bandType || device.band || "",
        powerControl: device.powerControl || "Auto",
        vControl: device.vControl || "Enabled",
        khzOption: device.khzOption || "Auto",
        lowFrequency: device.lowFrequency || "",
        highFrequency: device.highFrequency || "",
        customFields: Array.isArray(device.customFields) ? device.customFields : []
      }));
      setDevices(lnbDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({ bandType: "NONE", powerControl: "NONE", vControl: "NONE", khzOption: "NONE", customFields: [] });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEdit = (device: LNBDevice) => {
    setEditingDevice(device);
    setFormData({ ...device });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('lnbs', id);
      await apiService.logActivity(username, "LNB Deleted", `Deleted LNB: ${device?.name}`, 'global');
      await loadDevices();
      toast({ title: "LNB Deleted", description: "The LNB device has been successfully removed." });
    } finally {
      setIsLoading(false);
    }
  };

  // Custom field management
  const handleAddCustomField = () => {
    const current = formData.customFields || [];
    setFormData({ ...formData, customFields: [...current, { key: "", value: "" }] });
  };

  const handleRemoveCustomField = (index: number) => {
    const current = formData.customFields || [];
    setFormData({ ...formData, customFields: current.filter((_, i) => i !== index) });
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    const current = [...(formData.customFields || [])];
    current[index] = { ...current[index], [field]: val };
    setFormData({ ...formData, customFields: current });
  };

  // Admin: add new band type
  const handleAddBandType = () => {
    if (!newTypeName.trim()) return;
    const added = apiService.addCustomType('lnb_band', newTypeName.trim());
    if (added) {
      loadCustomTypes();
      setNewTypeName("");
      toast({ title: "Band Type Added", description: `"${newTypeName.trim()}" has been added.` });
    } else {
      toast({ title: "Duplicate", description: "This band type already exists.", variant: "destructive" });
    }
  };

  const handleDeleteBandType = (value: string) => {
    apiService.deleteCustomType('lnb_band', value);
    loadCustomTypes();
    toast({ title: "Band Type Removed" });
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      toast({ title: "Validation Error", description: "Device name is required.", variant: "destructive" });
      nameRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Check duplicate by name + lowFrequency
      const isDuplicate = await apiService.checkDuplicateByFields('lnbs', {
        name: formData.name!,
        lowFrequency: formData.lowFrequency || ""
      }, editingDevice?.id);
      
      if (isDuplicate) {
        toast({ title: "Duplicate Entry", description: "An LNB with this name and frequency already exists.", variant: "destructive" });
        nameRef.current?.focus();
        return;
      }

      const deviceData = {
        name: formData.name!,
        bandType: formData.bandType || "",
        powerControl: formData.powerControl || "Auto",
        vControl: formData.vControl || "Enabled",
        khzOption: formData.khzOption || "Auto",
        lowFrequency: formData.lowFrequency || "",
        highFrequency: formData.highFrequency || "",
        customFields: formData.customFields || []
      };

      if (editingDevice) {
        await apiService.updateEquipment('lnbs', editingDevice.id, deviceData);
        await apiService.logActivity(username, "LNB Updated", `Updated LNB: ${formData.name}`, 'global');
        toast({ title: "LNB Updated", description: "The LNB device has been successfully updated." });
      } else {
        await apiService.saveEquipment('lnbs', deviceData);
        await apiService.logActivity(username, "LNB Added", `Added new LNB: ${formData.name}`, 'global');
        toast({ title: "LNB Added", description: "The new LNB device has been successfully added." });
      }
      
      await loadDevices();
      setIsDialogOpen(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'bandType', label: 'Band Type', sortable: true },
    { key: 'powerControl', label: 'Power Control' },
    { key: 'lowFrequency', label: 'Low Freq' },
    { key: 'highFrequency', label: 'High Freq' },
    { 
      key: 'customFields', 
      label: 'Custom',
      render: (value: any[]) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).slice(0, 2).map((f, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{f.key}: {f.value}</Badge>
          ))}
          {(value || []).length > 2 && <Badge variant="outline" className="text-xs">+{value.length - 2}</Badge>}
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
              <Radio className="h-5 w-5 text-primary-foreground" />
            </div>
            LNB Management
          </h2>
          <p className="text-muted-foreground mt-1">Global bucket - Manage all LNB devices across projects</p>
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
                  <DialogTitle>Manage LNB Band Types</DialogTitle>
                  <DialogDescription>Add or remove custom band types (admin only)</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="flex gap-2">
                    <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="New band type name" onKeyDown={(e) => e.key === 'Enter' && handleAddBandType()} />
                    <Button size="sm" onClick={handleAddBandType}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Custom Types</Label>
                    {apiService.getCustomTypes('lnb_band').map((t) => (
                      <div key={t} className="flex items-center justify-between py-1 px-2 rounded bg-muted/50">
                        <span className="text-sm">{t}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteBandType(t)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {apiService.getCustomTypes('lnb_band').length === 0 && <p className="text-xs text-muted-foreground">No custom types added</p>}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add LNB
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" />
                  {editingDevice ? "Edit LNB Device" : "Add New LNB Device"}
                </DialogTitle>
                <DialogDescription>Configure LNB specifications and technical parameters</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <InlineFormField label="Name" required>
                  <Input ref={nameRef} value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Universal Ku-Band LNB" />
                </InlineFormField>
                <InlineFormField label="Band Type">
                  <Select value={formData.bandType || "NONE"} onValueChange={handleBandTypeChange}>
                    <SelectTrigger><SelectValue placeholder="Select band type" /></SelectTrigger>
                    <SelectContent>
                      {bandTypes.map((band) => <SelectItem key={band} value={band}>{band}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </InlineFormField>
                <InlineFormField label="Power Control">
                  <Select value={formData.powerControl || "NONE"} onValueChange={(v) => setFormData({ ...formData, powerControl: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{powerControls.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </InlineFormField>
                <InlineFormField label="V-Control">
                  <Select value={formData.vControl || "NONE"} onValueChange={(v) => setFormData({ ...formData, vControl: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{vControls.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </InlineFormField>
                <InlineFormField label="22KHz Option">
                  <Select value={formData.khzOption || "NONE"} onValueChange={(v) => setFormData({ ...formData, khzOption: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{khzOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </InlineFormField>
                <InlineFormField label="Low Freq (MHz)">
                  <Input value={formData.lowFrequency || ""} onChange={(e) => setFormData({ ...formData, lowFrequency: e.target.value })} placeholder="e.g., 9750" />
                </InlineFormField>
                <InlineFormField label="High Freq (MHz)">
                  <Input value={formData.highFrequency || ""} onChange={(e) => setFormData({ ...formData, highFrequency: e.target.value })} placeholder="e.g., 10600" />
                </InlineFormField>

                {/* Custom Key-Value Fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Custom Fields</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCustomField}>
                      <Plus className="h-3 w-3 mr-1" /> Add Field
                    </Button>
                  </div>
                  {(formData.customFields || []).map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input value={field.key} onChange={(e) => handleCustomFieldChange(idx, 'key', e.target.value)} placeholder="Key" className="flex-1" />
                      <Input value={field.value} onChange={(e) => handleCustomFieldChange(idx, 'value', e.target.value)} placeholder="Value" className="flex-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleRemoveCustomField(idx)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <>{editingDevice ? "Update" : "Add"} LNB</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading LNBs...</span>
            </div>
          ) : (
            <EquipmentTable
              data={devices}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              itemsPerPage={20}
              searchPlaceholder="Search LNBs..."
              emptyMessage="No LNB devices found. Click 'Add LNB' to create one."
              colorScheme="blue"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LNBManagement;
