import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Radio, Loader2 } from "lucide-react";
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
  lo1High: string;
  lo1Low: string;
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

  const bandTypes = ["C-Band", "Ku-Band", "Ka-Band", "L-Band"];
  const powerControls = ["Auto", "13V", "18V", "Off"];
  const vControls = ["Enabled", "Disabled"];
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
        bandType: device.bandType || device.band || "",
        powerControl: device.powerControl || "Auto",
        vControl: device.vControl || "Enabled",
        khzOption: device.khzOption || "Auto",
        lowFrequency: device.lowFrequency || "",
        highFrequency: device.highFrequency || "",
        lo1High: device.lo1High || "",
        lo1Low: device.lo1Low || ""
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
        bandType: formData.bandType || "",
        powerControl: formData.powerControl || "Auto",
        vControl: formData.vControl || "Enabled",
        khzOption: formData.khzOption || "Auto",
        lowFrequency: formData.lowFrequency || "",
        highFrequency: formData.highFrequency || "",
        lo1High: formData.lo1High || "",
        lo1Low: formData.lo1Low || ""
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
    { key: 'bandType', label: 'Band Type', sortable: true },
    { key: 'powerControl', label: 'Power Control' },
    { key: 'lowFrequency', label: 'Low Freq' },
    { key: 'highFrequency', label: 'High Freq' },
    { key: 'lo1High', label: 'LO1(H)' },
    { key: 'lo1Low', label: 'LO1(L)' }
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
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                {editingDevice ? "Edit LNB Device" : "Add New LNB Device"}
              </DialogTitle>
              <DialogDescription>
                Configure LNB specifications and technical parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <InlineFormField label="Name" required>
                <Input
                  ref={nameRef}
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Universal Ku-Band LNB"
                />
              </InlineFormField>
              <InlineFormField label="Band Type">
                <Select
                  value={formData.bandType || ""}
                  onValueChange={(value) => setFormData({ ...formData, bandType: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Select band type" /></SelectTrigger>
                  <SelectContent>
                    {bandTypes.map((band) => (
                      <SelectItem key={band} value={band}>{band}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="Power Control">
                <Select
                  value={formData.powerControl || "Auto"}
                  onValueChange={(value) => setFormData({ ...formData, powerControl: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {powerControls.map((ctrl) => (
                      <SelectItem key={ctrl} value={ctrl}>{ctrl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="V-Control">
                <Select
                  value={formData.vControl || "Enabled"}
                  onValueChange={(value) => setFormData({ ...formData, vControl: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vControls.map((ctrl) => (
                      <SelectItem key={ctrl} value={ctrl}>{ctrl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="22KHz Option">
                <Select
                  value={formData.khzOption || "Auto"}
                  onValueChange={(value) => setFormData({ ...formData, khzOption: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {khzOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="Low Freq (MHz)">
                <Input
                  value={formData.lowFrequency || ""}
                  onChange={(e) => setFormData({ ...formData, lowFrequency: e.target.value })}
                  placeholder="e.g., 9750"
                />
              </InlineFormField>
              <InlineFormField label="High Freq (MHz)">
                <Input
                  value={formData.highFrequency || ""}
                  onChange={(e) => setFormData({ ...formData, highFrequency: e.target.value })}
                  placeholder="e.g., 10600"
                />
              </InlineFormField>
              <InlineFormField label="LO1(H) (MHz)">
                <Input
                  value={formData.lo1High || ""}
                  onChange={(e) => setFormData({ ...formData, lo1High: e.target.value })}
                  placeholder="e.g., 10600"
                />
              </InlineFormField>
              <InlineFormField label="LO1(L) (MHz)">
                <Input
                  value={formData.lo1Low || ""}
                  onChange={(e) => setFormData({ ...formData, lo1Low: e.target.value })}
                  placeholder="e.g., 9750"
                />
              </InlineFormField>
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