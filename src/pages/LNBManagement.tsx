import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Radio, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface LNBDevice {
  id: string;
  name: string;
  lnbType: string;
  bandType: string;
  lnbPowerControl: string;
  vControl: string;
  repeatMode: string;
  khzOption: string;
  lowFrequency: string;
  highFrequency: string;
}

interface LNBManagementProps {
  username: string;
}

const LNBManagement = ({ username }: LNBManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<LNBDevice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<LNBDevice | null>(null);
  const [formData, setFormData] = useState<Partial<LNBDevice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const nameRef = useRef<HTMLInputElement>(null);
  const lowFreqRef = useRef<HTMLInputElement>(null);
  const highFreqRef = useRef<HTMLInputElement>(null);

  const lnbTypes = ["Universal", "Single", "Twin", "Quad", "Octo", "Wideband"];
  const bandTypes = ["C-Band", "Ku-Band", "Ka-Band", "L-Band"];
  const powerControls = ["Auto", "13V", "18V", "Off"];
  const vControls = ["Enabled", "Disabled"];
  const repeatModes = ["Single", "Continuous", "Off"];
  const khzOptions = ["Auto", "On", "Off"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('lnbs');
      const lnbDevices: LNBDevice[] = allDevices.map(device => ({
        id: device.id,
        name: device.name,
        lnbType: device.lnbType || device.type || "",
        bandType: device.bandType || device.band || "",
        lnbPowerControl: device.lnbPowerControl || "Auto",
        vControl: device.vControl || "Enabled",
        repeatMode: device.repeatMode || "Single",
        khzOption: device.khzOption || "Auto",
        lowFrequency: device.lowFrequency || "",
        highFrequency: device.highFrequency || ""
      }));
      setDevices(lnbDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEdit = (device: LNBDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('lnbs', id);
      await apiService.logActivity(username, "LNB Deleted", `Deleted LNB: ${device?.name}`, 'global');
      
      loadDevices();
      toast({
        title: "LNB Deleted",
        description: "The LNB device has been successfully removed.",
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

    if (!formData.lnbType) {
      toast({
        title: "Validation Error",
        description: "LNB Type is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.lowFrequency?.trim()) {
      toast({
        title: "Validation Error",
        description: "Low Frequency is required.",
        variant: "destructive",
      });
      lowFreqRef.current?.focus();
      return false;
    }

    if (!formData.highFrequency?.trim()) {
      toast({
        title: "Validation Error",
        description: "High Frequency is required.",
        variant: "destructive",
      });
      highFreqRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Check for duplicates
      const isDuplicate = await apiService.checkDuplicate('lnbs', formData.name!, editingDevice?.id);
      if (isDuplicate) {
        toast({
          title: "Duplicate Entry",
          description: "An LNB with this name already exists.",
          variant: "destructive",
        });
        nameRef.current?.focus();
        return;
      }

      const deviceData = {
        name: formData.name!,
        type: formData.lnbType!,
        lnbType: formData.lnbType!,
        bandType: formData.bandType || "",
        lnbPowerControl: formData.lnbPowerControl || "Auto",
        vControl: formData.vControl || "Enabled",
        repeatMode: formData.repeatMode || "Single",
        khzOption: formData.khzOption || "Auto",
        lowFrequency: formData.lowFrequency!,
        highFrequency: formData.highFrequency!
      };

      if (editingDevice) {
        await apiService.updateEquipment('lnbs', editingDevice.id, deviceData);
        await apiService.logActivity(username, "LNB Updated", `Updated LNB: ${formData.name}`, 'global');
        
        toast({
          title: "LNB Updated",
          description: "The LNB device has been successfully updated.",
        });
      } else {
        await apiService.saveEquipment('lnbs', deviceData);
        await apiService.logActivity(username, "LNB Added", `Added new LNB: ${formData.name}`, 'global');
        
        toast({
          title: "LNB Added",
          description: "The new LNB device has been successfully added.",
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
    { key: 'name', label: 'Name', sortable: true },
    { key: 'lnbType', label: 'LNB Type', sortable: true },
    { key: 'bandType', label: 'Band Type', sortable: true },
    { key: 'lnbPowerControl', label: 'Power Control' },
    { key: 'lowFrequency', label: 'Low Freq' },
    { key: 'highFrequency', label: 'High Freq' }
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
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all LNB devices across projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Add LNB
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                {editingDevice ? "Edit LNB Device" : "Add New LNB Device"}
              </DialogTitle>
              <DialogDescription>
                Configure LNB specifications and technical parameters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Universal Ku-Band LNB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lnbType">LNB Type *</Label>
                <Select
                  value={formData.lnbType || ""}
                  onValueChange={(value) => setFormData({ ...formData, lnbType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LNB type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lnbTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bandType">Band Type</Label>
                <Select
                  value={formData.bandType || ""}
                  onValueChange={(value) => setFormData({ ...formData, bandType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select band type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bandTypes.map((band) => (
                      <SelectItem key={band} value={band}>{band}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lnbPowerControl">LNB Power Control</Label>
                <Select
                  value={formData.lnbPowerControl || "Auto"}
                  onValueChange={(value) => setFormData({ ...formData, lnbPowerControl: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {powerControls.map((ctrl) => (
                      <SelectItem key={ctrl} value={ctrl}>{ctrl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vControl">V-Control</Label>
                <Select
                  value={formData.vControl || "Enabled"}
                  onValueChange={(value) => setFormData({ ...formData, vControl: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vControls.map((ctrl) => (
                      <SelectItem key={ctrl} value={ctrl}>{ctrl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeatMode">Repeat Mode</Label>
                <Select
                  value={formData.repeatMode || "Single"}
                  onValueChange={(value) => setFormData({ ...formData, repeatMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="khzOption">22KHz Option</Label>
                <Select
                  value={formData.khzOption || "Auto"}
                  onValueChange={(value) => setFormData({ ...formData, khzOption: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {khzOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowFrequency">Low Frequency (MHz) *</Label>
                <Input
                  ref={lowFreqRef}
                  id="lowFrequency"
                  value={formData.lowFrequency || ""}
                  onChange={(e) => setFormData({ ...formData, lowFrequency: e.target.value })}
                  placeholder="e.g., 9750"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highFrequency">High Frequency (MHz) *</Label>
                <Input
                  ref={highFreqRef}
                  id="highFrequency"
                  value={formData.highFrequency || ""}
                  onChange={(e) => setFormData({ ...formData, highFrequency: e.target.value })}
                  placeholder="e.g., 10600"
                />
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
                  <>{editingDevice ? "Update" : "Add"} LNB</>
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