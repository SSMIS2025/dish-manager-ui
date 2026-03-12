import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Satellite, Edit, Trash2, Radio, Zap, RotateCcw, Loader2, Settings, Search, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import InlineFormField from "@/components/InlineFormField";
import EquipmentMappingModal from "@/components/EquipmentMappingModal";
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
}

interface SatelliteManagementProps {
  username: string;
}

const SatelliteManagement = ({ username }: SatelliteManagementProps) => {
  const { toast } = useToast();
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'satellite' | 'carrier' | 'service'; id: string; carrierId?: string } | null>(null);
  
  const [satelliteFilter, setSatelliteFilter] = useState("");
  
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  
  // Carrier form
  const [isCarrierDialogOpen, setIsCarrierDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [carrierFormData, setCarrierFormData] = useState<Partial<Carrier>>({});
  
  // Service form
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState<Partial<Service>>({});
  const [serviceCarrierId, setServiceCarrierId] = useState<string>("");

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

  const filteredSatellites = satellites.filter(sat => 
    sat.name.toLowerCase().includes(satelliteFilter.toLowerCase()) ||
    sat.position.toLowerCase().includes(satelliteFilter.toLowerCase())
  );

  const getTotalServices = (sat: SatelliteData) => {
    return sat.carriers.reduce((sum, c) => sum + (c.services?.length || 0), 0);
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
        mappedMotor: sat.mappedMotor || ""
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
      const parsedSwitches = (switches || []).map((s: any) => ({
        ...s,
        switchOptions: Array.isArray(s.switchOptions) 
          ? s.switchOptions 
          : (typeof s.switchOptions === 'string' ? (() => { try { return JSON.parse(s.switchOptions); } catch { return []; } })() : [])
      }));
      setAllSwitches(parsedSwitches);
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
        if (selectedSatellite?.id === deleteTarget.id) setSelectedSatellite(null);
        loadSatellites();
        toast({ title: "Satellite Deleted", description: "The satellite and all its carriers/services have been removed." });
      } else if (deleteTarget.type === 'carrier' && selectedSatellite) {
        const updatedCarriers = selectedSatellite.carriers.filter(c => c.id !== deleteTarget.id);
        const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
        await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
        setSelectedSatellite(updatedSatellite);
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
    const isDuplicate = await apiService.checkSatelliteDuplicate(formData.name, editingSatellite?.id);
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
        mappedMotor: formData.mappedMotor || ""
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
    setServiceCarrierId(carrier.id);
    setEditingService(null);
    setServiceFormData({ factoryDefault: false, scramble: false, frequency: carrier.frequency });
    setIsServiceDialogOpen(true);
    setTimeout(() => serviceNameRef.current?.focus(), 100);
  };

  const handleEditService = (carrier: Carrier, service: Service) => {
    setServiceCarrierId(carrier.id);
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
    if (!validateServiceForm() || !selectedSatellite || !serviceCarrierId) return;
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
        if (c.id === serviceCarrierId) {
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
      loadSatellites();
      setIsServiceDialogOpen(false);
      setServiceFormData({});
      toast({ title: editingService ? "Service Updated" : "Service Added", description: `Service "${newService.name}" has been saved.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEquipmentDialog = () => {
    if (selectedSatellite) setIsEquipmentDialogOpen(true);
  };

  const handleSaveEquipmentMapping = async (mappings: { lnbId: string; switchIds: string[]; motorId: string }) => {
    if (!selectedSatellite) return;
    const updatedSatellite = {
      ...selectedSatellite,
      mappedLnb: mappings.lnbId || (allLnbs.length > 0 ? allLnbs[0].id : ""),
      mappedSwitch: mappings.switchIds.join(','),
      mappedMotor: mappings.motorId
    };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    setSelectedSatellite(updatedSatellite);
    loadSatellites();
  };

  const getEquipmentName = (type: string, id: string) => {
    const lists: Record<string, any[]> = { lnb: allLnbs, switch: allSwitches, motor: allMotors };
    const item = lists[type]?.find(i => i.id === id);
    if (!item) return "-";
    if (type === 'switch') return item.switchType || "-";
    if (type === 'motor') return item.motorType || "-";
    return item.name || "-";
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
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Satellite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Satellite className="h-5 w-5 text-primary" />
                {editingSatellite ? "Edit Satellite" : "Add New Satellite"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <InlineFormField label="Name" required>
                <Input ref={nameRef} value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., ASTRA 2E/2F/2G" />
              </InlineFormField>
              <InlineFormField label="Position" required>
                <Input value={formData.position || ""} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="e.g., 28.2°E" />
              </InlineFormField>
              <InlineFormField label="Direction">
                <Select value={formData.direction || "none"} onValueChange={(value) => setFormData({ ...formData, direction: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select</SelectItem>
                    {directions.map((dir) => <SelectItem key={dir} value={dir}>{dir}</SelectItem>)}
                  </SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="Status/Age">
                <Input value={formData.age || ""} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="e.g., Active since 2010" />
              </InlineFormField>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
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
        <div className="space-y-6">
          {/* Satellite List - Single line table view with service count */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Satellites
                  <Badge variant="secondary">{filteredSatellites.length}</Badge>
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter satellites..."
                    value={satelliteFilter}
                    onChange={(e) => setSatelliteFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden mx-4 mb-4">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Carriers</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSatellites.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No satellites found</TableCell></TableRow>
                    ) : (
                      filteredSatellites.map((satellite, index) => (
                        <TableRow 
                          key={satellite.id} 
                          className={cn(
                            "cursor-pointer hover:bg-muted/30",
                            selectedSatellite?.id === satellite.id && "bg-primary/5"
                          )}
                          onClick={() => handleSelectSatellite(satellite)}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{satellite.name}</TableCell>
                          <TableCell>{satellite.position || '-'}</TableCell>
                          <TableCell>{satellite.direction || '-'}</TableCell>
                          <TableCell><Badge variant="secondary">{satellite.carriers?.length || 0}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{getTotalServices(satellite)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {satellite.mappedLnb && <Badge variant="outline" className="text-[10px]">LNB</Badge>}
                              {satellite.mappedSwitch && <Badge variant="outline" className="text-[10px]">SW</Badge>}
                              {satellite.mappedMotor && <Badge variant="outline" className="text-[10px]">MTR</Badge>}
                              {!satellite.mappedLnb && !satellite.mappedSwitch && !satellite.mappedMotor && <span className="text-xs text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEdit(satellite); }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'satellite', id: satellite.id }); }}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Selected Satellite Configuration - Accordion based carriers */}
          {selectedSatellite && (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedSatellite.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedSatellite.position} {selectedSatellite.direction}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{selectedSatellite.carriers?.length || 0} Carriers</Badge>
                    <Badge variant="secondary">{getTotalServices(selectedSatellite)} Services</Badge>
                    <Button variant="outline" size="sm" onClick={handleOpenEquipmentDialog}>
                      <Settings className="h-4 w-4 mr-1" />
                      Equipment
                    </Button>
                    <Button size="sm" onClick={handleAddCarrier}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Carrier
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Equipment Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="text-sm">LNB: {getEquipmentName('lnb', selectedSatellite.mappedLnb)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm">Switch: {selectedSatellite.mappedSwitch ? selectedSatellite.mappedSwitch.split(',').map(id => getEquipmentName('switch', id)).join(', ') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    <span className="text-sm">Motor: {getEquipmentName('motor', selectedSatellite.mappedMotor)}</span>
                  </div>
                </div>

                {/* Accordion-based Carriers with inline Services */}
                {selectedSatellite.carriers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No carriers. Click "Add Carrier" to create one.</p>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {selectedSatellite.carriers.map((carrier, cIdx) => (
                      <AccordionItem key={carrier.id} value={carrier.id} className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <span className="font-medium">{carrier.name}</span>
                            <Badge variant="outline" className="text-xs">{carrier.frequency} MHz</Badge>
                            <Badge variant="outline" className="text-xs">{carrier.polarization}</Badge>
                            <Badge variant="secondary" className="text-xs">{carrier.services?.length || 0} services</Badge>
                            <div className="ml-auto flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditCarrier(carrier)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'carrier', id: carrier.id })}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {/* Carrier details */}
                          <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-muted/20 rounded-lg text-sm">
                            <div><span className="text-muted-foreground">Symbol Rate:</span> {carrier.symbolRate || '-'}</div>
                            <div><span className="text-muted-foreground">FEC:</span> {carrier.fec || '-'}</div>
                            <div><span className="text-muted-foreground">FEC Mode:</span> {carrier.fecMode || '-'}</div>
                            <div><span className="text-muted-foreground">Factory Default:</span> {carrier.factoryDefault ? 'Yes' : 'No'}</div>
                          </div>

                          {/* Services in this carrier */}
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Services ({carrier.services?.length || 0})</h4>
                            <Button size="sm" variant="outline" onClick={() => handleAddService(carrier)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Service
                            </Button>
                          </div>
                          {(carrier.services?.length || 0) === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No services. Click "Add Service" to add one.</p>
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
                                  {carrier.services.map((service, sIdx) => (
                                    <TableRow key={service.id} className="hover:bg-muted/30">
                                      <TableCell>{sIdx + 1}</TableCell>
                                      <TableCell className="font-medium">{service.name}</TableCell>
                                      <TableCell>{service.frequency || '-'}</TableCell>
                                      <TableCell>{service.videoPid || '-'}</TableCell>
                                      <TableCell>{service.audioPid || '-'}</TableCell>
                                      <TableCell>{service.pcrPid || '-'}</TableCell>
                                      <TableCell>{service.programNumber || '-'}</TableCell>
                                      <TableCell>{service.scramble ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditService(carrier, service)}><Edit className="h-3 w-3" /></Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'service', id: service.id, carrierId: carrier.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Carrier Dialog */}
      <Dialog open={isCarrierDialogOpen} onOpenChange={setIsCarrierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{editingCarrier ? "Edit Carrier" : "Add New Carrier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <InlineFormField label="Carrier Name" required>
              <Input ref={carrierNameRef} value={carrierFormData.name || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, name: e.target.value })} placeholder="e.g., BBC Multiplex 1" />
            </InlineFormField>
            <InlineFormField label="Frequency (MHz)" required>
              <Input value={carrierFormData.frequency || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, frequency: e.target.value })} placeholder="e.g., 10773" />
            </InlineFormField>
            <InlineFormField label="Polarization">
              <Select value={carrierFormData.polarization || "Horizontal"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, polarization: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{polarizations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </InlineFormField>
            <InlineFormField label="Symbol Rate">
              <Input value={carrierFormData.symbolRate || ""} onChange={(e) => setCarrierFormData({ ...carrierFormData, symbolRate: e.target.value })} placeholder="e.g., 22000" />
            </InlineFormField>
            <InlineFormField label="FEC">
              <Select value={carrierFormData.fec || "Auto"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, fec: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fecOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </InlineFormField>
            <InlineFormField label="FEC Mode">
              <Select value={carrierFormData.fecMode || "Auto"} onValueChange={(v) => setCarrierFormData({ ...carrierFormData, fecMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fecModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </InlineFormField>
            <div className="flex items-center gap-3 pl-[132px]">
              <Checkbox checked={carrierFormData.factoryDefault || false} onCheckedChange={(c) => setCarrierFormData({ ...carrierFormData, factoryDefault: !!c })} />
              <span className="text-sm">Factory Default</span>
            </div>
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
          <div className="space-y-4 py-4">
            <InlineFormField label="Service Name" required>
              <Input ref={serviceNameRef} value={serviceFormData.name || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })} placeholder="e.g., BBC One HD" />
            </InlineFormField>
            <InlineFormField label="Frequency">
              <Input value={serviceFormData.frequency || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, frequency: e.target.value })} placeholder="e.g., 10773" />
            </InlineFormField>
            <InlineFormField label="Video PID">
              <Input value={serviceFormData.videoPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, videoPid: e.target.value })} placeholder="e.g., 5500" />
            </InlineFormField>
            <InlineFormField label="Audio PID">
              <Input value={serviceFormData.audioPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, audioPid: e.target.value })} placeholder="e.g., 5501" />
            </InlineFormField>
            <InlineFormField label="PCR PID">
              <Input value={serviceFormData.pcrPid || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, pcrPid: e.target.value })} placeholder="e.g., 5500" />
            </InlineFormField>
            <InlineFormField label="Program Number">
              <Input value={serviceFormData.programNumber || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, programNumber: e.target.value })} placeholder="e.g., 6940" />
            </InlineFormField>
            <InlineFormField label="FAV Group">
              <Input value={serviceFormData.favGroup || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, favGroup: e.target.value })} placeholder="e.g., Entertainment" />
            </InlineFormField>
            <InlineFormField label="Preference">
              <Input value={serviceFormData.preference || ""} onChange={(e) => setServiceFormData({ ...serviceFormData, preference: e.target.value })} placeholder="e.g., 1" />
            </InlineFormField>
            <div className="flex items-center gap-6 pl-[132px]">
              <div className="flex items-center gap-2">
                <Checkbox checked={serviceFormData.factoryDefault || false} onCheckedChange={(c) => setServiceFormData({ ...serviceFormData, factoryDefault: !!c })} />
                <span className="text-sm">Factory Default</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={serviceFormData.scramble || false} onCheckedChange={(c) => setServiceFormData({ ...serviceFormData, scramble: !!c })} />
                <span className="text-sm">Scramble</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveService} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Service"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* XXL Equipment Mapping Modal */}
      <EquipmentMappingModal
        open={isEquipmentDialogOpen}
        onOpenChange={setIsEquipmentDialogOpen}
        satellite={selectedSatellite}
        onSave={handleSaveEquipmentMapping}
        allLnbs={allLnbs}
        allSwitches={allSwitches}
        allMotors={allMotors}
        onEquipmentUpdate={loadEquipment}
      />

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

// cn utility inline for this component
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default SatelliteManagement;
