import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Satellite, Edit, Trash2, Radio, Zap, RotateCcw, Activity, ChevronRight, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { EquipmentTable } from "@/components/EquipmentTable";

interface Carrier {
  id: string;
  name: string;
  frequency: string;
  frequencyType: string;
  polarization: string;
  symbolRate: string;
  fec: string;
  modulation: string;
  services: Service[];
}

interface Service {
  id: string;
  name: string;
  type: string;
  sid: string;
  vpid: string;
  apid: string;
}

interface SatelliteData {
  id: string;
  name: string;
  position: string;
  age: string;
  direction: string;
  carriers: Carrier[];
  mappedLnbs: string[];
  mappedSwitches: string[];
  mappedMotors: string[];
  mappedUnicables: string[];
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
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});
  
  // Equipment lists for mapping
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  
  // Carrier form
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [carrierFormData, setCarrierFormData] = useState<Partial<Carrier>>({});
  
  // Service form
  const [serviceFormData, setServiceFormData] = useState<Partial<Service>>({});

  const directions = ["East", "West"];
  const frequencyTypes = ["DVB-S", "DVB-S2", "DVB-S2X"];
  const polarizations = ["Horizontal", "Vertical", "Left Circular", "Right Circular"];
  const modulations = ["QPSK", "8PSK", "16APSK", "32APSK"];
  const serviceTypes = ["TV", "Radio", "Data", "HD", "UHD"];

  useEffect(() => {
    loadSatellites();
    loadEquipment();
  }, []);

  const loadSatellites = async () => {
    const allSatellites = await apiService.getSatellites();
    const satelliteData: SatelliteData[] = allSatellites.map(sat => ({
      id: sat.id,
      name: sat.name,
      position: sat.position || "",
      age: sat.age || "",
      direction: sat.direction || "",
      carriers: sat.carriers || [],
      mappedLnbs: sat.mappedLnbs || [],
      mappedSwitches: sat.mappedSwitches || [],
      mappedMotors: sat.mappedMotors || [],
      mappedUnicables: sat.mappedUnicables || []
    }));
    setSatellites(satelliteData);
  };

  const loadEquipment = async () => {
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
  };

  const handleAdd = () => {
    setEditingSatellite(null);
    setFormData({ carriers: [], mappedLnbs: [], mappedSwitches: [], mappedMotors: [], mappedUnicables: [] });
    setIsDialogOpen(true);
  };

  const handleEdit = (satellite: SatelliteData) => {
    setEditingSatellite(satellite);
    setFormData(satellite);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const satellite = satellites.find(s => s.id === id);
    await apiService.deleteEquipment('satellites', id);
    await apiService.logActivity(username, "Satellite Deleted", `Deleted satellite: ${satellite?.name}`, 'global');
    
    if (selectedSatellite?.id === id) {
      setSelectedSatellite(null);
    }
    
    loadSatellites();
    toast({
      title: "Satellite Deleted",
      description: "The satellite has been successfully removed.",
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in satellite name and position.",
        variant: "destructive",
      });
      return;
    }

    const satelliteData = {
      name: formData.name,
      position: formData.position,
      age: formData.age || "",
      direction: formData.direction || "",
      carriers: formData.carriers || [],
      mappedLnbs: formData.mappedLnbs || [],
      mappedSwitches: formData.mappedSwitches || [],
      mappedMotors: formData.mappedMotors || [],
      mappedUnicables: formData.mappedUnicables || []
    };

    if (editingSatellite) {
      await apiService.updateSatellite(editingSatellite.id, satelliteData);
      await apiService.logActivity(username, "Satellite Updated", `Updated satellite: ${formData.name}`, 'global');
      
      toast({
        title: "Satellite Updated",
        description: "The satellite has been successfully updated.",
      });
    } else {
      await apiService.saveSatellite(satelliteData);
      await apiService.logActivity(username, "Satellite Added", `Added new satellite: ${formData.name}`, 'global');
      
      toast({
        title: "Satellite Added",
        description: "The new satellite has been successfully added.",
      });
    }
    
    loadSatellites();
    setIsDialogOpen(false);
    setFormData({});
  };

  const handleSelectSatellite = (satellite: SatelliteData) => {
    setSelectedSatellite(satellite);
  };

  // Carrier management
  const handleAddCarrier = () => {
    setSelectedCarrier(null);
    setCarrierFormData({ services: [] });
    setIsCarrierDialogOpen(true);
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setCarrierFormData(carrier);
    setIsCarrierDialogOpen(true);
  };

  const handleSaveCarrier = async () => {
    if (!carrierFormData.name || !carrierFormData.frequency) {
      toast({
        title: "Validation Error",
        description: "Please fill in carrier name and frequency.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSatellite) return;

    const newCarrier: Carrier = {
      id: selectedCarrier?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: carrierFormData.name!,
      frequency: carrierFormData.frequency!,
      frequencyType: carrierFormData.frequencyType || "DVB-S2",
      polarization: carrierFormData.polarization || "Horizontal",
      symbolRate: carrierFormData.symbolRate || "",
      fec: carrierFormData.fec || "",
      modulation: carrierFormData.modulation || "QPSK",
      services: carrierFormData.services || []
    };

    let updatedCarriers: Carrier[];
    if (selectedCarrier) {
      updatedCarriers = selectedSatellite.carriers.map(c => 
        c.id === selectedCarrier.id ? newCarrier : c
      );
    } else {
      updatedCarriers = [...selectedSatellite.carriers, newCarrier];
    }

    const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    
    setSelectedSatellite(updatedSatellite);
    loadSatellites();
    setIsCarrierDialogOpen(false);
    setCarrierFormData({});

    toast({
      title: selectedCarrier ? "Carrier Updated" : "Carrier Added",
      description: `Carrier "${newCarrier.name}" has been saved.`,
    });
  };

  const handleDeleteCarrier = async (carrierId: string) => {
    if (!selectedSatellite) return;

    const updatedCarriers = selectedSatellite.carriers.filter(c => c.id !== carrierId);
    const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    
    setSelectedSatellite(updatedSatellite);
    loadSatellites();

    toast({
      title: "Carrier Deleted",
      description: "The carrier has been removed.",
    });
  };

  // Service management
  const handleAddService = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setServiceFormData({});
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceFormData.name) {
      toast({
        title: "Validation Error",
        description: "Please fill in service name.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSatellite || !selectedCarrier) return;

    const newService: Service = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: serviceFormData.name!,
      type: serviceFormData.type || "TV",
      sid: serviceFormData.sid || "",
      vpid: serviceFormData.vpid || "",
      apid: serviceFormData.apid || ""
    };

    const updatedCarriers = selectedSatellite.carriers.map(c => {
      if (c.id === selectedCarrier.id) {
        return { ...c, services: [...c.services, newService] };
      }
      return c;
    });

    const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    
    setSelectedSatellite(updatedSatellite);
    setSelectedCarrier({ ...selectedCarrier, services: [...selectedCarrier.services, newService] });
    loadSatellites();
    setIsServiceDialogOpen(false);
    setServiceFormData({});

    toast({
      title: "Service Added",
      description: `Service "${newService.name}" has been added to carrier.`,
    });
  };

  const handleDeleteService = async (carrierId: string, serviceId: string) => {
    if (!selectedSatellite) return;

    const updatedCarriers = selectedSatellite.carriers.map(c => {
      if (c.id === carrierId) {
        return { ...c, services: c.services.filter(s => s.id !== serviceId) };
      }
      return c;
    });

    const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    
    setSelectedSatellite(updatedSatellite);
    if (selectedCarrier?.id === carrierId) {
      setSelectedCarrier({ ...selectedCarrier, services: selectedCarrier.services.filter(s => s.id !== serviceId) });
    }
    loadSatellites();

    toast({
      title: "Service Deleted",
      description: "The service has been removed.",
    });
  };

  // Equipment mapping
  const handleToggleEquipment = async (type: 'lnbs' | 'switches' | 'motors' | 'unicables', equipmentId: string) => {
    if (!selectedSatellite) return;

    const mappingKey = type === 'lnbs' ? 'mappedLnbs' : 
                       type === 'switches' ? 'mappedSwitches' : 
                       type === 'motors' ? 'mappedMotors' : 'mappedUnicables';
    
    const currentMappings = selectedSatellite[mappingKey] || [];
    const isCurrentlyMapped = currentMappings.includes(equipmentId);
    
    const newMappings = isCurrentlyMapped 
      ? currentMappings.filter((id: string) => id !== equipmentId)
      : [...currentMappings, equipmentId];

    const updatedSatellite = { ...selectedSatellite, [mappingKey]: newMappings };
    await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
    
    setSelectedSatellite(updatedSatellite);
    loadSatellites();
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'position', label: 'Position', sortable: true },
    { key: 'direction', label: 'Direction', sortable: true },
    { 
      key: 'carriers', 
      label: 'Carriers',
      render: (carriers: Carrier[]) => <Badge variant="secondary">{carriers?.length || 0}</Badge>
    },
    { key: 'age', label: 'Status' }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Satellite className="h-5 w-5 text-white" />
            </div>
            Satellite Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure satellites with carriers, services, and equipment mappings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Satellite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Satellite className="h-5 w-5 text-blue-600" />
                {editingSatellite ? "Edit Satellite" : "Add New Satellite"}
              </DialogTitle>
              <DialogDescription>
                Enter satellite basic information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Satellite Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ASTRA 2E/2F/2G"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., 28.2°E"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={formData.direction || ""}
                  onValueChange={(value) => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {directions.map((dir) => (
                      <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Status/Age</Label>
                <Input
                  id="age"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g., Active since 2010"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-blue-600">
                {editingSatellite ? "Update" : "Add"} Satellite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Satellite List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Satellites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {satellites.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No satellites found</p>
              ) : (
                satellites.map((satellite) => (
                  <div
                    key={satellite.id}
                    onClick={() => handleSelectSatellite(satellite)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedSatellite?.id === satellite.id 
                        ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{satellite.name}</h4>
                        <p className="text-sm text-muted-foreground">{satellite.position} {satellite.direction}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{satellite.carriers?.length || 0} carriers</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(satellite); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(satellite.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {!selectedSatellite ? (
              <div className="text-center py-20 text-muted-foreground">
                <Satellite className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Select a satellite to configure carriers, services, and equipment</p>
              </div>
            ) : (
              <Tabs defaultValue="carriers" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="carriers">Carriers & Services</TabsTrigger>
                  <TabsTrigger value="equipment">Equipment Mapping</TabsTrigger>
                </TabsList>
                
                <TabsContent value="carriers" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Carriers ({selectedSatellite.carriers?.length || 0})</h3>
                    <Button size="sm" onClick={handleAddCarrier}>
                      <Plus className="h-4 w-4 mr-1" /> Add Carrier
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Carriers List */}
                    <Card className="border-2">
                      <CardHeader className="py-3 bg-muted/50">
                        <CardTitle className="text-sm">Carriers</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[400px]">
                        <CardContent className="p-2">
                          {(selectedSatellite.carriers || []).length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">No carriers configured</p>
                          ) : (
                            selectedSatellite.carriers.map((carrier) => (
                              <div
                                key={carrier.id}
                                onClick={() => setSelectedCarrier(carrier)}
                                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                                  selectedCarrier?.id === carrier.id 
                                    ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300' 
                                    : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium text-sm">{carrier.name}</h5>
                                    <p className="text-xs text-muted-foreground">
                                      {carrier.frequency} MHz • {carrier.frequencyType} • {carrier.polarization}
                                    </p>
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {carrier.services?.length || 0} services
                                    </Badge>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEditCarrier(carrier); }}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteCarrier(carrier.id); }}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </ScrollArea>
                    </Card>

                    {/* Services List */}
                    <Card className="border-2">
                      <CardHeader className="py-3 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            Services {selectedCarrier ? `- ${selectedCarrier.name}` : ''}
                          </CardTitle>
                          {selectedCarrier && (
                            <Button size="sm" variant="outline" className="h-7" onClick={() => handleAddService(selectedCarrier)}>
                              <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <ScrollArea className="h-[400px]">
                        <CardContent className="p-2">
                          {!selectedCarrier ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">Select a carrier to view services</p>
                          ) : (selectedCarrier.services || []).length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">No services in this carrier</p>
                          ) : (
                            selectedCarrier.services.map((service) => (
                              <div key={service.id} className="p-3 rounded-lg mb-2 bg-muted/30">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium text-sm">{service.name}</h5>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">{service.type}</Badge>
                                      {service.sid && <span className="text-xs text-muted-foreground">SID: {service.sid}</span>}
                                    </div>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleDeleteService(selectedCarrier.id, service.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="equipment" className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select equipment to map to this satellite</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LNBs */}
                    <Card>
                      <CardHeader className="py-3 bg-gradient-to-r from-green-500/10 to-green-600/5">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Radio className="h-4 w-4 text-green-600" /> LNBs
                        </CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[150px]">
                        <CardContent className="p-2">
                          {allLnbs.map((lnb) => (
                            <div
                              key={lnb.id}
                              onClick={() => handleToggleEquipment('lnbs', lnb.id)}
                              className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                                selectedSatellite.mappedLnbs?.includes(lnb.id)
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {lnb.name}
                            </div>
                          ))}
                          {allLnbs.length === 0 && <p className="text-center text-muted-foreground py-4 text-xs">No LNBs available</p>}
                        </CardContent>
                      </ScrollArea>
                    </Card>

                    {/* Switches */}
                    <Card>
                      <CardHeader className="py-3 bg-gradient-to-r from-orange-500/10 to-orange-600/5">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-600" /> Switches
                        </CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[150px]">
                        <CardContent className="p-2">
                          {allSwitches.map((sw) => (
                            <div
                              key={sw.id}
                              onClick={() => handleToggleEquipment('switches', sw.id)}
                              className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                                selectedSatellite.mappedSwitches?.includes(sw.id)
                                  ? 'bg-orange-100 dark:bg-orange-900'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {sw.name}
                            </div>
                          ))}
                          {allSwitches.length === 0 && <p className="text-center text-muted-foreground py-4 text-xs">No switches available</p>}
                        </CardContent>
                      </ScrollArea>
                    </Card>

                    {/* Motors */}
                    <Card>
                      <CardHeader className="py-3 bg-gradient-to-r from-purple-500/10 to-purple-600/5">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <RotateCcw className="h-4 w-4 text-purple-600" /> Motors
                        </CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[150px]">
                        <CardContent className="p-2">
                          {allMotors.map((motor) => (
                            <div
                              key={motor.id}
                              onClick={() => handleToggleEquipment('motors', motor.id)}
                              className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                                selectedSatellite.mappedMotors?.includes(motor.id)
                                  ? 'bg-purple-100 dark:bg-purple-900'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {motor.name}
                            </div>
                          ))}
                          {allMotors.length === 0 && <p className="text-center text-muted-foreground py-4 text-xs">No motors available</p>}
                        </CardContent>
                      </ScrollArea>
                    </Card>

                    {/* Unicables */}
                    <Card>
                      <CardHeader className="py-3 bg-gradient-to-r from-pink-500/10 to-pink-600/5">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4 text-pink-600" /> Unicables
                        </CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[150px]">
                        <CardContent className="p-2">
                          {allUnicables.map((unicable) => (
                            <div
                              key={unicable.id}
                              onClick={() => handleToggleEquipment('unicables', unicable.id)}
                              className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                                selectedSatellite.mappedUnicables?.includes(unicable.id)
                                  ? 'bg-pink-100 dark:bg-pink-900'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {unicable.name}
                            </div>
                          ))}
                          {allUnicables.length === 0 && <p className="text-center text-muted-foreground py-4 text-xs">No unicables available</p>}
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carrier Dialog */}
      <Dialog open={isCarrierDialogOpen} onOpenChange={setIsCarrierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{selectedCarrier ? "Edit Carrier" : "Add New Carrier"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Carrier Name *</Label>
              <Input
                value={carrierFormData.name || ""}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, name: e.target.value })}
                placeholder="e.g., BBC Multiplex 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency (MHz) *</Label>
              <Input
                value={carrierFormData.frequency || ""}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, frequency: e.target.value })}
                placeholder="e.g., 10773"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency Type</Label>
              <Select
                value={carrierFormData.frequencyType || "DVB-S2"}
                onValueChange={(value) => setCarrierFormData({ ...carrierFormData, frequencyType: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {frequencyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Polarization</Label>
              <Select
                value={carrierFormData.polarization || "Horizontal"}
                onValueChange={(value) => setCarrierFormData({ ...carrierFormData, polarization: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {polarizations.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Symbol Rate</Label>
              <Input
                value={carrierFormData.symbolRate || ""}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, symbolRate: e.target.value })}
                placeholder="e.g., 22000"
              />
            </div>
            <div className="space-y-2">
              <Label>FEC</Label>
              <Input
                value={carrierFormData.fec || ""}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, fec: e.target.value })}
                placeholder="e.g., 2/3"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Modulation</Label>
              <Select
                value={carrierFormData.modulation || "QPSK"}
                onValueChange={(value) => setCarrierFormData({ ...carrierFormData, modulation: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modulations.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCarrierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCarrier}>Save Carrier</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>Add a service to carrier: {selectedCarrier?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={serviceFormData.name || ""}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="e.g., BBC One HD"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={serviceFormData.type || "TV"}
                onValueChange={(value) => setServiceFormData({ ...serviceFormData, type: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>SID</Label>
                <Input
                  value={serviceFormData.sid || ""}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, sid: e.target.value })}
                  placeholder="6301"
                />
              </div>
              <div className="space-y-2">
                <Label>VPID</Label>
                <Input
                  value={serviceFormData.vpid || ""}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, vpid: e.target.value })}
                  placeholder="5100"
                />
              </div>
              <div className="space-y-2">
                <Label>APID</Label>
                <Input
                  value={serviceFormData.apid || ""}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, apid: e.target.value })}
                  placeholder="5101"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveService}>Add Service</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SatelliteManagement;
