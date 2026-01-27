import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface LNBDevice {
  id: string;
  name: string;
  type: string;
  frequency: string;
  polarization: string;
  skew: string;
  band: string;
  noiseFigure: string;
  localOscillator: string;
  gain: string;
  testResult: string;
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

  const lnbTypes = ["Universal", "Single", "Twin", "Quad", "Octo"];
  const bands = ["C-Band", "Ku-Band", "Ka-Band", "L-Band"];
  const polarizations = ["Horizontal", "Vertical", "Circular"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const allDevices = await apiService.getEquipment('lnbs');
    const lnbDevices: LNBDevice[] = allDevices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      frequency: device.frequency || "",
      polarization: device.polarization || "",
      skew: device.skew || "",
      band: device.band || "",
      noiseFigure: device.noiseFigure || "",
      localOscillator: device.localOscillator || "",
      gain: device.gain || "",
      testResult: device.testResult || "Not Tested"
    }));
    setDevices(lnbDevices);
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (device: LNBDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const device = devices.find(d => d.id === id);
    await apiService.deleteEquipment('lnbs', id);
    await apiService.logActivity(username, "LNB Deleted", `Deleted LNB: ${device?.name}`, 'global');
    
    loadDevices();
    toast({
      title: "LNB Deleted",
      description: "The LNB device has been successfully removed.",
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
    const isDuplicate = await apiService.checkDuplicate('lnbs', formData.name!, editingDevice?.id);
    if (isDuplicate) {
      toast({
        title: "Duplicate Entry",
        description: "An LNB with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    const deviceData = {
      name: formData.name,
      type: formData.type,
      frequency: formData.frequency || "",
      polarization: formData.polarization || "",
      skew: formData.skew || "",
      band: formData.band || "",
      noiseFigure: formData.noiseFigure || "",
      localOscillator: formData.localOscillator || "",
      gain: formData.gain || "",
      testResult: formData.testResult || "Not Tested"
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
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'band', label: 'Band', sortable: true },
    { key: 'frequency', label: 'Frequency' },
    { key: 'polarization', label: 'Polarization' },
    { 
      key: 'testResult', 
      label: 'Test Result',
      render: (value: string) => (
        <Badge variant={value === 'Passed' ? 'default' : value === 'Failed' ? 'destructive' : 'secondary'}>
          {value || 'Not Tested'}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Radio className="h-5 w-5 text-white" />
            </div>
            LNB Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all LNB devices across projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add LNB
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-green-600" />
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
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Universal Ku-Band LNB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">LNB Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                <Label htmlFor="frequency">Frequency Range</Label>
                <Input
                  id="frequency"
                  value={formData.frequency || ""}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., 10.7-12.75 GHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="band">Band</Label>
                <Select
                  value={formData.band || ""}
                  onValueChange={(value) => setFormData({ ...formData, band: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select band" />
                  </SelectTrigger>
                  <SelectContent>
                    {bands.map((band) => (
                      <SelectItem key={band} value={band}>{band}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="polarization">Polarization</Label>
                <Select
                  value={formData.polarization || ""}
                  onValueChange={(value) => setFormData({ ...formData, polarization: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select polarization" />
                  </SelectTrigger>
                  <SelectContent>
                    {polarizations.map((pol) => (
                      <SelectItem key={pol} value={pol}>{pol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skew">Skew</Label>
                <Input
                  id="skew"
                  value={formData.skew || ""}
                  onChange={(e) => setFormData({ ...formData, skew: e.target.value })}
                  placeholder="e.g., 0°"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noiseFigure">Noise Figure</Label>
                <Input
                  id="noiseFigure"
                  value={formData.noiseFigure || ""}
                  onChange={(e) => setFormData({ ...formData, noiseFigure: e.target.value })}
                  placeholder="e.g., 0.1 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localOscillator">Local Oscillator</Label>
                <Input
                  id="localOscillator"
                  value={formData.localOscillator || ""}
                  onChange={(e) => setFormData({ ...formData, localOscillator: e.target.value })}
                  placeholder="e.g., 9.75/10.6 GHz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gain">Gain</Label>
                <Input
                  id="gain"
                  value={formData.gain || ""}
                  onChange={(e) => setFormData({ ...formData, gain: e.target.value })}
                  placeholder="e.g., 60 dB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testResult">Test Result</Label>
                <Select
                  value={formData.testResult || "Not Tested"}
                  onValueChange={(value) => setFormData({ ...formData, testResult: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Not Tested">Not Tested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-green-500 to-green-600">
                {editingDevice ? "Update" : "Add"} LNB
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
            searchPlaceholder="Search LNBs..."
            emptyMessage="No LNB devices found. Click 'Add LNB' to create one."
            colorScheme="green"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default LNBManagement;
