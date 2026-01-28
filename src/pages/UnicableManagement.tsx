import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface UnicableDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  port: string;
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
  
  const nameRef = useRef<HTMLInputElement>(null);

  const unicableTypes = ["DSCR", "DDR"];
  const statusOptions = ["Active", "Inactive", "Error"];
  const portOptions = ["1", "2", "3", "4", "5", "6", "7", "8"];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const allDevices = await apiService.getEquipment('unicables');
      const unicableDevices: UnicableDevice[] = allDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type || "DSCR",
        status: device.status || "Active",
        port: device.port || ""
      }));
      setDevices(unicableDevices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({ type: "DSCR" });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
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
      await apiService.logActivity(username, "Unicable Deleted", `Deleted unicable: ${device?.name}`, 'global');
      
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
        description: "Unicable Type is required.",
        variant: "destructive",
      });
      return false;
    }

    // Port is required only for DSCR type
    if (formData.type === "DSCR" && !formData.port) {
      toast({
        title: "Validation Error",
        description: "Port is required for DSCR type.",
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
      const isDuplicate = await apiService.checkDuplicate('unicables', formData.name!, editingDevice?.id);
      if (isDuplicate) {
        toast({
          title: "Duplicate Entry",
          description: "A unicable with this name already exists.",
          variant: "destructive",
        });
        nameRef.current?.focus();
        return;
      }

      const deviceData = {
        name: formData.name!,
        type: formData.type!,
        status: formData.status || "Active",
        port: formData.type === "DSCR" ? (formData.port || "") : ""
      };

      if (editingDevice) {
        await apiService.updateEquipment('unicables', editingDevice.id, deviceData);
        await apiService.logActivity(username, "Unicable Updated", `Updated unicable: ${formData.name}`, 'global');
        
        toast({
          title: "Unicable Updated",
          description: "The unicable device has been successfully updated.",
        });
      } else {
        await apiService.saveEquipment('unicables', deviceData);
        await apiService.logActivity(username, "Unicable Added", `Added new unicable: ${formData.name}`, 'global');
        
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

  const handleTypeChange = (value: string) => {
    setFormData({ 
      ...formData, 
      type: value,
      port: value === "DDR" ? "" : formData.port // Clear port if DDR
    });
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { 
      key: 'port', 
      label: 'Port',
      render: (value: string, item: UnicableDevice) => (
        item.type === "DSCR" ? <Badge variant="secondary">{value || '-'}</Badge> : <span className="text-muted-foreground">N/A</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          'Active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          'Inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          'Error': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
        return (
          <Badge className={statusColors[value] || ''}>
            {value || 'Active'}
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
          <DialogContent className="max-w-md">
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
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Unicable II LNB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Unicable Type *</Label>
                <Select
                  value={formData.type || "DSCR"}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unicable type" />
                  </SelectTrigger>
                  <SelectContent>
                    {unicableTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Port - only shown for DSCR type */}
              {formData.type === "DSCR" && (
                <div className="space-y-2">
                  <Label htmlFor="port">Port *</Label>
                  <Select
                    value={formData.port || ""}
                    onValueChange={(value) => setFormData({ ...formData, port: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select port" />
                    </SelectTrigger>
                    <SelectContent>
                      {portOptions.map((port) => (
                        <SelectItem key={port} value={port}>Port {port}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || "Active"}
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