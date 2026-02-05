import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Satellite, Edit, Trash2, Radio, Zap, RotateCcw, Activity, Loader2, Settings, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Carrier {
  id: string;
  name: string;
  frequency: string;
  polarization: string;
  symbolRate: string;
  fec: string;
  fecMode: string;
  factoryDefault: boolean;
  services: Service[];
}

interface Service {
  id: string;
  name: string;
  frequency: string;
  videoPid: string;
  audioPid: string;
  pcrPid: string;
  programNumber: string;
  favGroup: string;
  factoryDefault: boolean;
  preference: string;
  scramble: boolean;
}

interface SatelliteData {
  id: string;
  name: string;
  position: string;
  age: string;
  direction: string;
  carriers: Carrier[];
  mappedLnb: string;
  mappedSwitch: string;
  mappedMotor: string;
  mappedUnicable: string;
}

interface SatelliteManagementProps {
  username: string;
}

const SatelliteManagement = ({ username }: SatelliteManagementProps) => {
  const { toast } = useToast();
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCarrierDialogOpen, setIsCarrierDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'satellite' | 'carrier' | 'service'; id: string; carrierId?: string } | null>(null);
  
  // Filter states
  const [satelliteFilter, setSatelliteFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [polarizationFilter, setPolarizationFilter] = useState("all");
  
  // Pagination states
  const [carrierPage, setCarrierPage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Equipment lists for mapping
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  
  // Carrier form
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [carrierFormData, setCarrierFormData] = useState<Partial<Carrier>>({});
  
  // Service form
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState<Partial<Service>>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const carrierNameRef = useRef<HTMLInputElement>(null);
  const serviceNameRef = useRef<HTMLInputElement>(null);

  const directions = ["East", "West"];
  const polarizations = ["Horizontal", "Vertical", "Left Circular", "Right Circular"];
  const fecOptions = ["1/2", "2/3", "3/4", "5/6", "7/8", "Auto"];
  const fecModes = ["DVB-S", "DVB-S2", "DVB-S2X", "Auto"];

  useEffect(() => {
    loadSatellites();
    loadEquipment();
  }, []);

  // Filtered satellites
  const filteredSatellites = satellites.filter(sat => 
    sat.name.toLowerCase().includes(satelliteFilter.toLowerCase()) ||
    sat.position.toLowerCase().includes(satelliteFilter.toLowerCase())
  );

  // Filtered carriers with pagination
  const getFilteredCarriers = () => {
    if (!selectedSatellite) return [];
    return selectedSatellite.carriers.filter(carrier => {
      const matchesName = carrier.name.toLowerCase().includes(carrierFilter.toLowerCase()) ||
        carrier.frequency.toLowerCase().includes(carrierFilter.toLowerCase());
      const matchesPolarization = polarizationFilter === "all" || carrier.polarization === polarizationFilter;
      return matchesName && matchesPolarization;
    });
  };

  const getPaginatedCarriers = () => {
    const filtered = getFilteredCarriers();
    const startIndex = (carrierPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalCarrierPages = () => {
    return Math.ceil(getFilteredCarriers().length / ITEMS_PER_PAGE);
  };

  // Filtered services with pagination
  const getFilteredServices = () => {
    if (!selectedCarrier) return [];
    return (selectedCarrier.services || []).filter(service =>
      service.name.toLowerCase().includes(serviceFilter.toLowerCase()) ||
      (service.frequency && service.frequency.toLowerCase().includes(serviceFilter.toLowerCase()))
    );
  };

  const getPaginatedServices = () => {
    const filtered = getFilteredServices();
    const startIndex = (servicePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalServicePages = () => {
    return Math.ceil(getFilteredServices().length / ITEMS_PER_PAGE);
  };

  const loadSatellites = async () => {
    setIsLoading(true);
    try {
      const allSatellites = await apiService.getSatellites();
      const satelliteData: SatelliteData[] = allSatellites.map(sat => ({
        id: sat.id,
        name: sat.name,
        position: sat.position || "",
        age: sat.age || "",
        direction: sat.direction || "",
        carriers: sat.carriers || [],
        mappedLnb: sat.mappedLnb || "",
        mappedSwitch: sat.mappedSwitch || "",
        mappedMotor: sat.mappedMotor || "",
        mappedUnicable: sat.mappedUnicable || ""
      }));
      setSatellites(satelliteData);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const [lnbs, switches, motors, unicables] = await Promise.all([
        apiService.getEquipment('lnbs'),
        apiService.getEquipment('switches'),
        apiService.getEquipment('motors'),
        apiService.getEquipment('unicables')
      ]);
      setAllLnbs(lnbs);
      setAllSwitches(switches);
      setAllMotors(motors);
      setAllUnicables(unicables);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const handleAdd = () => {
    setEditingSatellite(null);
    setFormData({ carriers: [] });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEdit = (satellite: SatelliteData) => {
    setEditingSatellite(satellite);
    setFormData(satellite);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    
    setIsLoading(true);
    try {
      if (deleteTarget.type === 'satellite') {
        const satellite = satellites.find(s => s.id === deleteTarget.id);
        await apiService.deleteEquipment('satellites', deleteTarget.id);
        await apiService.logActivity(username, "Satellite Deleted", `Deleted satellite: ${satellite?.name}`, 'global');
        
        if (selectedSatellite?.id === deleteTarget.id) {
          setSelectedSatellite(null);
        }
        loadSatellites();
        toast({ title: "Satellite Deleted", description: "The satellite and all its carriers/services have been removed." });
      } else if (deleteTarget.type === 'carrier' && selectedSatellite) {
        // Delete carrier and its services
        const updatedCarriers = selectedSatellite.carriers.filter(c => c.id !== deleteTarget.id);
        const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
        await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
        setSelectedSatellite(updatedSatellite);
        if (selectedCarrier?.id === deleteTarget.id) {
          setSelectedCarrier(null);
        }
        loadSatellites();
        toast({ title: "Carrier Deleted", description: "The carrier and all its services have been removed." });
      } else if (deleteTarget.type === 'service' && selectedSatellite && deleteTarget.carrierId) {
        const updatedCarriers = selectedSatellite.carriers.map(c => {
          if (c.id === deleteTarget.carrierId) {
            return { ...c, services: c.services.filter(s => s.id !== deleteTarget.id) };
          }
          return c;
        });
        const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
        await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
        setSelectedSatellite(updatedSatellite);
        if (selectedCarrier?.id === deleteTarget.carrierId) {
          setSelectedCarrier({ ...selectedCarrier, services: selectedCarrier.services.filter(s => s.id !== deleteTarget.id) });
        }
        loadSatellites();
        toast({ title: "Service Deleted", description: "The service has been removed." });
      }
    } finally {
      setIsLoading(false);
      setDeleteTarget(null);
    }
  };

  const validateSatelliteForm = async (): Promise<boolean> => {
    if (!formData.name?.trim()) {
      toast({ title: "Validation Error", description: "Satellite name is required.", variant: "destructive" });
      nameRef.current?.focus();
      return false;
    }
    if (!formData.position?.trim()) {
      toast({ title: "Validation Error", description: "Position is required.", variant: "destructive" });
      return false;
    }

    // Check for duplicate name
    const isDuplicate = await apiService.checkSatelliteDuplicate(
      formData.name,
      editingSatellite?.id
    );
    if (isDuplicate) {
      toast({ title: "Duplicate Name", description: "A satellite with this name already exists.", variant: "destructive" });
      nameRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    const isValid = await validateSatelliteForm();
    if (!isValid) return;

    setIsSaving(true);
    try {
      const satelliteData = {
        name: formData.name!,
        position: formData.position!,
        age: formData.age || "",
        direction: formData.direction || "",
        carriers: formData.carriers || [],
        mappedLnb: formData.mappedLnb || "",
        mappedSwitch: formData.mappedSwitch || "",
        mappedMotor: formData.mappedMotor || "",
        mappedUnicable: formData.mappedUnicable || ""
      };

      if (editingSatellite) {
        await apiService.updateSatellite(editingSatellite.id, satelliteData);
        await apiService.logActivity(username, "Satellite Updated", `Updated satellite: ${formData.name}`, 'global');
        toast({ title: "Satellite Updated", description: "The satellite has been successfully updated." });
      } else {
        await apiService.saveSatellite(satelliteData);
        await apiService.logActivity(username, "Satellite Added", `Added new satellite: ${formData.name}`, 'global');
        toast({ title: "Satellite Added", description: "The new satellite has been successfully added." });
      }
      
      loadSatellites();
      setIsDialogOpen(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSatellite = (satellite: SatelliteData) => {
    setSelectedSatellite(satellite);
    setSelectedCarrier(null);
    setCarrierPage(1);
    setServicePage(1);
  };

  // Carrier management
  const handleAddCarrier = () => {
    setEditingCarrier(null);
    setCarrierFormData({ services: [], factoryDefault: false });
    setIsCarrierDialogOpen(true);
    setTimeout(() => carrierNameRef.current?.focus(), 100);
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    setCarrierFormData(carrier);
    setIsCarrierDialogOpen(true);
  };

  const validateCarrierForm = (): boolean => {
    if (!carrierFormData.name?.trim()) {
      toast({ title: "Validation Error", description: "Carrier name is required.", variant: "destructive" });
      carrierNameRef.current?.focus();
      return false;
    }
    if (!carrierFormData.frequency?.trim()) {
      toast({ title: "Validation Error", description: "Frequency is required.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveCarrier = async () => {
    if (!validateCarrierForm() || !selectedSatellite) return;

    setIsSaving(true);
    try {
      const newCarrier: Carrier = {
        id: editingCarrier?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: carrierFormData.name!,
        frequency: carrierFormData.frequency!,
        polarization: carrierFormData.polarization || "Horizontal",
        symbolRate: carrierFormData.symbolRate || "",
        fec: carrierFormData.fec || "Auto",
        fecMode: carrierFormData.fecMode || "Auto",
        factoryDefault: carrierFormData.factoryDefault || false,
        services: editingCarrier?.services || []
      };

      let updatedCarriers: Carrier[];
      if (editingCarrier) {
        updatedCarriers = selectedSatellite.carriers.map(c => c.id === editingCarrier.id ? newCarrier : c);
      } else {
        updatedCarriers = [...selectedSatellite.carriers, newCarrier];
      }

      const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
      await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
      
      setSelectedSatellite(updatedSatellite);
      loadSatellites();
      setIsCarrierDialogOpen(false);
      setCarrierFormData({});

      toast({ title: editingCarrier ? "Carrier Updated" : "Carrier Added", description: `Carrier "${newCarrier.name}" has been saved.` });
    } finally {
      setIsSaving(false);
    }
  };

  // Service management
  const handleAddService = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setEditingService(null);
    setServiceFormData({ factoryDefault: false, scramble: false, frequency: carrier.frequency });
    setIsServiceDialogOpen(true);
    setTimeout(() => serviceNameRef.current?.focus(), 100);
  };

  const handleEditService = (carrier: Carrier, service: Service) => {
    setSelectedCarrier(carrier);
    setEditingService(service);
    setServiceFormData(service);
    setIsServiceDialogOpen(true);
  };

  const validateServiceForm = (): boolean => {
    if (!serviceFormData.name?.trim()) {
      toast({ title: "Validation Error", description: "Service name is required.", variant: "destructive" });
      serviceNameRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleSaveService = async () => {
    if (!validateServiceForm() || !selectedSatellite || !selectedCarrier) return;

    setIsSaving(true);
    try {
      const newService: Service = {
        id: editingService?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: serviceFormData.name!,
        frequency: serviceFormData.frequency || "",
        videoPid: serviceFormData.videoPid || "",
        audioPid: serviceFormData.audioPid || "",
        pcrPid: serviceFormData.pcrPid || "",
        programNumber: serviceFormData.programNumber || "",
        favGroup: serviceFormData.favGroup || "",
        factoryDefault: serviceFormData.factoryDefault || false,
        preference: serviceFormData.preference || "",
        scramble: serviceFormData.scramble || false
      };

      const updatedCarriers = selectedSatellite.carriers.map(c => {
        if (c.id === selectedCarrier.id) {
          if (editingService) {
            return { ...c, services: c.services.map(s => s.id === editingService.id ? newService : s) };
          }
          return { ...c, services: [...c.services, newService] };
        }
        return c;
      });

      const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
      await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
      
      setSelectedSatellite(updatedSatellite);
      const updatedCarrier = updatedCarriers.find(c => c.id === selectedCarrier.id);
      if (updatedCarrier) setSelectedCarrier(updatedCarrier);
      loadSatellites();
      setIsServiceDialogOpen(false);
      setServiceFormData({});

      toast({ title: editingService ? "Service Updated" : "Service Added", description: `Service "${newService.name}" has been saved.` });
    } finally {
      setIsSaving(false);
    }
  };

  // Equipment mapping
  const handleOpenEquipmentDialog = () => {
    if (selectedSatellite) {
      setFormData({
        mappedLnb: selectedSatellite.mappedLnb,
        mappedSwitch: selectedSatellite.mappedSwitch,
        mappedMotor: selectedSatellite.mappedMotor,
        mappedUnicable: selectedSatellite.mappedUnicable
      });
      setIsEquipmentDialogOpen(true);
    }
  };

  const handleSaveEquipment = async () => {
    if (!selectedSatellite) return;

    setIsSavingEquipment(true);
    try {
      const updatedSatellite = {
        ...selectedSatellite,
        mappedLnb: formData.mappedLnb || "",
        mappedSwitch: formData.mappedSwitch || "",
        mappedMotor: formData.mappedMotor || "",
        mappedUnicable: formData.mappedUnicable || ""
      };
      await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
      setSelectedSatellite(updatedSatellite);
      loadSatellites();
      setIsEquipmentDialogOpen(false);
      toast({ title: "Equipment Updated", description: "Equipment mappings have been saved." });
    } finally {
      setIsSavingEquipment(false);
    }
  };

  const getEquipmentName = (type: string, id: string) => {
    const lists: Record<string, any[]> = { lnb: allLnbs, switch: allSwitches, motor: allMotors, unicable: allUnicables };
    const item = lists[type]?.find(i => i.id === id);
    if (!item) return "-";
    // For types without name field, display type info
    if (type === 'switch') return item.switchType || "-";
    if (type === 'motor') return item.motorType || "-";
    if (type === 'unicable') return item.unicableType || "-";
    return item.name || "-";
  };

  const getTotalServices = () => {
    if (!selectedSatellite) return 0;
    return selectedSatellite.carriers.reduce((sum, c) => sum + (c.services?.length || 0), 0);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Satellite className="h-5 w-5 text-primary-foreground" />
            </div>
            Satellite Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure satellites with carriers, services, and equipment mappings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Add Satellite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Satellite className="h-5 w-5 text-primary" />
                {editingSatellite ? "Edit Satellite" : "Add New Satellite"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Satellite Name *</Label>
                <Input ref={nameRef} value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., ASTRA 2E/2F/2G" />
              </div>
              <div className="space-y-2">
                <Label>Position *</Label>
                <Input value={formData.position || ""} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="e.g., 28.2°E" />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={formData.direction || ""} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                  <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                  <SelectContent>{directions.map((dir) => <SelectItem key={dir} value={dir}>{dir}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status/Age</Label>
                <Input value={formData.age || ""} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="e.g., Active since 2010" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <>{editingSatellite ? "Update" : "Add"} Satellite</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-3 text-lg text-muted-foreground">Loading satellites...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Satellite List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Satellites
                <Badge variant="secondary">{filteredSatellites.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter satellites..."
                  value={satelliteFilter}
                  onChange={(e) => setSatelliteFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[calc(100vh-340px)]">
                {filteredSatellites.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No satellites found</p>
                ) : (
                  filteredSatellites.map((satellite) => (
                    <div
                      key={satellite.id}
                      onClick={() => handleSelectSatellite(satellite)}
                      className={`p-4 border-b cursor-pointer transition-colors ${selectedSatellite?.id === satellite.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{satellite.name}</h4>
                          <p className="text-sm text-muted-foreground">{satellite.position} {satellite.direction}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{satellite.carriers?.length || 0} carriers</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEdit(satellite); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'satellite', id: satellite.id }); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Configuration Panel */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              {!selectedSatellite ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Satellite className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Select a satellite to configure carriers, services, and equipment</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedSatellite.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedSatellite.position} {selectedSatellite.direction}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{selectedSatellite.carriers?.length || 0} Carriers</Badge>
                      <Badge variant="secondary">{getTotalServices()} Services</Badge>
                      <Button variant="outline" size="sm" onClick={handleOpenEquipmentDialog}>
                        <Settings className="h-4 w-4 mr-1" />
                        Equipment
                      </Button>
                    </div>
                  </div>

                  {/* Equipment Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      <span className="text-sm">LNB: {getEquipmentName('lnb', selectedSatellite.mappedLnb)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm">Switch: {getEquipmentName('switch', selectedSatellite.mappedSwitch)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-primary" />
                      <span className="text-sm">Motor: {getEquipmentName('motor', selectedSatellite.mappedMotor)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm">Unicable: {getEquipmentName('unicable', selectedSatellite.mappedUnicable)}</span>
                    </div>
                  </div>

                  <Tabs defaultValue="carriers" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="carriers">Carriers</TabsTrigger>
                      <TabsTrigger value="services">Services</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="carriers">
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <h4 className="font-medium">Carrier List</h4>
                          <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Filter carriers..."
                              value={carrierFilter}
                              onChange={(e) => setCarrierFilter(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Select value={polarizationFilter} onValueChange={setPolarizationFilter}>
                            <SelectTrigger className="w-40">
                              <Filter className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="Polarization" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Polarizations</SelectItem>
                              {polarizations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button size="sm" onClick={handleAddCarrier}><Plus className="h-4 w-4 mr-1" /> Add Carrier</Button>
                      </div>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Polarization</TableHead>
                              <TableHead>Symbol Rate</TableHead>
                              <TableHead>FEC</TableHead>
                              <TableHead>Services</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedCarriers().length === 0 ? (
                              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No carriers found.</TableCell></TableRow>
                            ) : (
                              getPaginatedCarriers().map((carrier, index) => (
                                <TableRow key={carrier.id} className="hover:bg-muted/30">
                                  <TableCell>{(carrierPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                  <TableCell className="font-medium">{carrier.name}</TableCell>
                                  <TableCell>{carrier.frequency}</TableCell>
                                  <TableCell>{carrier.polarization}</TableCell>
                                  <TableCell>{carrier.symbolRate || '-'}</TableCell>
                                  <TableCell>{carrier.fec || '-'}</TableCell>
                                  <TableCell><Badge variant="secondary">{carrier.services?.length || 0}</Badge></TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditCarrier(carrier)}><Edit className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'carrier', id: carrier.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Carrier Pagination */}
                      {getTotalCarrierPages() > 1 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                          <p className="text-sm text-muted-foreground">
                            Showing {(carrierPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(carrierPage * ITEMS_PER_PAGE, getFilteredCarriers().length)} of {getFilteredCarriers().length} carriers
                          </p>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCarrierPage(p => Math.max(1, p - 1))}
                              disabled={carrierPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm">Page {carrierPage} of {getTotalCarrierPages()}</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCarrierPage(p => Math.min(getTotalCarrierPages(), p + 1))}
                              disabled={carrierPage >= getTotalCarrierPages()}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="services">
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <h4 className="font-medium">Services</h4>
                          <Select value={selectedCarrier?.id || ""} onValueChange={(id) => setSelectedCarrier(selectedSatellite.carriers.find(c => c.id === id) || null)}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Select carrier" /></SelectTrigger>
                            <SelectContent>{selectedSatellite.carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {selectedCarrier && (
                            <div className="relative flex-1 max-w-xs">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Filter services..."
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          )}
                        </div>
                        {selectedCarrier && <Button size="sm" onClick={() => handleAddService(selectedCarrier)}><Plus className="h-4 w-4 mr-1" /> Add Service</Button>}
                      </div>
                      {!selectedCarrier ? (
                        <p className="text-center text-muted-foreground py-8">Select a carrier to view its services</p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Video PID</TableHead>
                                <TableHead>Audio PID</TableHead>
                                <TableHead>PCR PID</TableHead>
                                <TableHead>Program #</TableHead>
                                <TableHead>Scramble</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredServices().length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No services found.</TableCell></TableRow>
                              ) : (
                                getFilteredServices().map((service, index) => (
                                  <TableRow key={service.id} className="hover:bg-muted/30">
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell>{service.frequency || '-'}</TableCell>
                                    <TableCell>{service.videoPid || '-'}</TableCell>
                                    <TableCell>{service.audioPid || '-'}</TableCell>
                                    <TableCell>{service.pcrPid || '-'}</TableCell>
                                    <TableCell>{service.programNumber || '-'}</TableCell>
                                    <TableCell>{service.scramble ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditService(selectedCarrier, service)}><Edit className="h-3 w-3" /></Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'service', id: service.id, carrierId: selectedCarrier.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Carrier Dialog */}
      <Dialog open={isCarrierDialogOpen} onOpenChange={setIsCarrierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{editingCarrier ? "Edit Carrier" : "Add New Carrier"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Carrier Name *</Label><Input ref={carrierNameRef} value={carrierFormData.name || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, name: e.target.value })} placeholder="e.g., BBC Multiplex 1" /></div>
            <div className="space-y-2"><Label>Frequency (MHz) *</Label><Input value={carrierFormData.frequency || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, frequency: e.target.value })} placeholder="e.g., 10773" /></div>
            <div className="space-y-2"><Label>Polarization</Label><Select value={carrierFormData.polarization || "Horizontal"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, polarization: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{polarizations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Symbol Rate</Label><Input value={carrierFormData.symbolRate || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, symbolRate: e.target.value })} placeholder="e.g., 22000" /></div>
            <div className="space-y-2"><Label>FEC</Label><Select value={carrierFormData.fec || "Auto"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, fec: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fecOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>FEC Mode</Label><Select value={carrierFormData.fecMode || "Auto"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, fecMode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fecModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 flex items-center gap-2"><Checkbox checked={carrierFormData.factoryDefault || false} onCheckedChange={(c) => setCarrierFormData({ ...carrierFormData, factoryDefault: !!c })} /><Label>Factory Default</Label></div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCarrierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCarrier} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Carrier"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Service Name *</Label><Input ref={serviceNameRef} value={serviceFormData.name || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })} placeholder="e.g., BBC One HD" /></div>
            <div className="space-y-2"><Label>Frequency</Label><Input value={serviceFormData.frequency || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, frequency: e.target.value })} placeholder="e.g., 10773" /></div>
            <div className="space-y-2"><Label>Video PID</Label><Input value={serviceFormData.videoPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, videoPid: e.target.value })} placeholder="e.g., 5500" /></div>
            <div className="space-y-2"><Label>Audio PID</Label><Input value={serviceFormData.audioPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, audioPid: e.target.value })} placeholder="e.g., 5501" /></div>
            <div className="space-y-2"><Label>PCR PID</Label><Input value={serviceFormData.pcrPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, pcrPid: e.target.value })} placeholder="e.g., 5500" /></div>
            <div className="space-y-2"><Label>Program Number</Label><Input value={serviceFormData.programNumber || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, programNumber: e.target.value })} placeholder="e.g., 6940" /></div>
            <div className="space-y-2"><Label>FAV Group</Label><Input value={serviceFormData.favGroup || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, favGroup: e.target.value })} placeholder="e.g., Entertainment" /></div>
            <div className="space-y-2"><Label>Preference</Label><Input value={serviceFormData.preference || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, preference: e.target.value })} placeholder="e.g., 1" /></div>
            <div className="space-y-2 flex flex-col gap-3">
              <div className="flex items-center gap-2"><Checkbox checked={serviceFormData.factoryDefault || false} onCheckedChange={(c) => setServiceFormData({ ...serviceFormData, factoryDefault: !!c })} /><Label>Factory Default</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={serviceFormData.scramble || false} onCheckedChange={(c) => setServiceFormData({ ...serviceFormData, scramble: !!c })} /><Label>Scramble</Label></div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveService} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Service"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Mapping Dialog */}
      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Equipment Mapping</DialogTitle>
            <DialogDescription>Select equipment for this satellite (optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>LNB</Label><Select value={formData.mappedLnb || "none"} onValueChange={(v) => setFormData({ ...formData, mappedLnb: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select LNB" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allLnbs.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Switch</Label><Select value={formData.mappedSwitch || "none"} onValueChange={(v) => setFormData({ ...formData, mappedSwitch: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select Switch" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allSwitches.map(s => <SelectItem key={s.id} value={s.id}>{s.switchType || `Switch ${s.id.slice(-4)}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Motor</Label><Select value={formData.mappedMotor || "none"} onValueChange={(v) => setFormData({ ...formData, mappedMotor: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select Motor" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allMotors.map(m => <SelectItem key={m.id} value={m.id}>{m.motorType || `Motor ${m.id.slice(-4)}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Unicable</Label><Select value={formData.mappedUnicable || "none"} onValueChange={(v) => setFormData({ ...formData, mappedUnicable: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select Unicable" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allUnicables.map(u => <SelectItem key={u.id} value={u.id}>{u.unicableType || `Unicable ${u.id.slice(-4)}`}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEquipment} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'satellite' && "Are you sure you want to delete this satellite? All carriers and services will also be deleted."}
              {deleteTarget?.type === 'carrier' && "Are you sure you want to delete this carrier? All services in this carrier will also be deleted."}
              {deleteTarget?.type === 'service' && "Are you sure you want to delete this service?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SatelliteManagement;