import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface MotorDevice {
  id: string;
  name: string;
  type: string;
  position: string;
  longitude: string;
  latitude: string;
  eastWest: string;
  northSouth: string;
  status: string;
}

interface MotorManagementProps {
  username: string;
}

const MotorManagement = ({ username }: MotorManagementProps) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<MotorDevice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MotorDevice | null>(null);
  const [formData, setFormData] = useState<Partial<MotorDevice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const nameRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLInputElement>(null);
  const longitudeRef = useRef<HTMLInputElement>(null);
  const latitudeRef = useRef<HTMLInputElement>(null);

  const motorTypes = ["DiSEqC 1.2", "DiSEqC 1.3 (USALS)", "H-H Mount", "Polar Mount"];
  const statusOptions = ["Positioned", "Moving", "Error", "Calibrating"];
  const eastWestOptions = ["East", "West"];
  const northSouthOptions = ["North", "South"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('motors');
      const motorDevices: MotorDevice[] = allDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type || "",
        position: device.position || "",
        longitude: device.longitude || "",
        latitude: device.latitude || "",
        eastWest: device.eastWest || "East",
        northSouth: device.northSouth || "North",
        status: device.status || "Positioned"
      }));
      setDevices(motorDevices);
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

  const handleEdit = (device: MotorDevice) => {
    setEditingDevice(device);
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const device = devices.find(d => d.id === id);
      await apiService.deleteEquipment('motors', id);
      await apiService.logActivity(username, "Motor Deleted", `Deleted motor: ${device?.name}`, 'global');
      
      loadDevices();
      toast({
        title: "Motor Deleted",
        description: "The motor device has been successfully removed.",
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

    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Motor Type is required.",
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
      const isDuplicate = await apiService.checkDuplicate('motors', formData.name!, editingDevice?.id);
      if (isDuplicate) {
        toast({
          title: "Duplicate Entry",
          description: "A motor with this name already exists.",
          variant: "destructive",
        });
        nameRef.current?.focus();
        return;
      }

      const deviceData = {
        name: formData.name!,
        type: formData.type!,
        position: formData.position || "",
        longitude: formData.longitude || "",
        latitude: formData.latitude || "",
        eastWest: formData.eastWest || "East",
        northSouth: formData.northSouth || "North",
        status: formData.status || "Positioned"
      };

      if (editingDevice) {
        await apiService.updateEquipment('motors', editingDevice.id, deviceData);
        await apiService.logActivity(username, "Motor Updated", `Updated motor: ${formData.name}`, 'global');
        
        toast({
          title: "Motor Updated",
          description: "The motor device has been successfully updated.",
        });
      } else {
        await apiService.saveEquipment('motors', deviceData);
        await apiService.logActivity(username, "Motor Added", `Added new motor: ${formData.name}`, 'global');
        
        toast({
          title: "Motor Added",
          description: "The new motor device has been successfully added.",
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
    { key: 'type', label: 'Type', sortable: true },
    { key: 'position', label: 'Position', sortable: true },
    { key: 'longitude', label: 'Longitude' },
    { key: 'latitude', label: 'Latitude' },
    { 
      key: 'eastWest', 
      label: 'E/W',
      render: (value: string) => <Badge variant="outline">{value}</Badge>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          'Positioned': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          'Moving': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          'Error': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          'Calibrating': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        };
        return (
          <Badge className={statusColors[value] || ''}>
            {value || 'Positioned'}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-primary-foreground" />
            </div>
            Motor Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Global bucket - Manage all dish positioning motors
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Add Motor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                {editingDevice ? "Edit Motor Device" : "Add New Motor Device"}
              </DialogTitle>
              <DialogDescription>
                Configure motor specifications and positioning
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
                  placeholder="e.g., USALS Motor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Motor Type *</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select motor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {motorTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  ref={positionRef}
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., 28.2°"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  ref={longitudeRef}
                  id="longitude"
                  value={formData.longitude || ""}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., -0.1278"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  ref={latitudeRef}
                  id="latitude"
                  value={formData.latitude || ""}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 51.5074"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eastWest">East/West</Label>
                <Select
                  value={formData.eastWest || "East"}
                  onValueChange={(value) => setFormData({ ...formData, eastWest: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eastWestOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="northSouth">North/South</Label>
                <Select
                  value={formData.northSouth || "North"}
                  onValueChange={(value) => setFormData({ ...formData, northSouth: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {northSouthOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || "Positioned"}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <>{editingDevice ? "Update" : "Add"} Motor</>
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
              <span className="ml-2 text-muted-foreground">Loading Motors...</span>
            </div>
          ) : (
            <EquipmentTable
              data={devices}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              itemsPerPage={20}
              searchPlaceholder="Search motors..."
              emptyMessage="No motor devices found. Click 'Add Motor' to create one."
              colorScheme="blue"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MotorManagement;