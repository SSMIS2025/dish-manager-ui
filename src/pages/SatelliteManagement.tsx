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
import { Plus, Satellite, Edit, Trash2, Radio, Zap, RotateCcw, Loader2, Settings, Search, Eye, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import InlineFormField from "@/components/InlineFormField";
import EquipmentMappingModal from "@/components/EquipmentMappingModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'satellite' | 'carrier' | 'service'; id: string; carrierId?: string } | null>(null);
  const [satelliteFilter, setSatelliteFilter] = useState("");
  
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);

  // Inline add states for carriers and services
  const [newCarrierRow, setNewCarrierRow] = useState<Partial<Carrier> | null>(null);
  const [newServiceRows, setNewServiceRows] = useState<Record<string, Partial<Service> | null>>({});

  const nameRef = useRef<HTMLInputElement>(null);

  const directions = ["East", "West"];
  const polarizations = ["Horizontal", "Vertical", "Left Circular", "Right Circular"];
  const fecOptions = ["1/2", "2/3", "3/4", "5/6", "7/8", "Auto"];
  const fecModes = ["DVB-S", "DVB-S2", "DVB-S2X", "Auto"];

  useEffect(() => { loadSatellites(); loadEquipment(); }, []);

  const filteredSatellites = satellites.filter(sat => 
    sat.name.toLowerCase().includes(satelliteFilter.toLowerCase()) ||
    sat.position.toLowerCase().includes(satelliteFilter.toLowerCase())
  );

  const getTotalServices = (sat: SatelliteData) => sat.carriers.reduce((sum, c) => sum + (c.services?.length || 0), 0);

  const loadSatellites = async () => {
    setIsLoading(true);
    try {
      const allSatellites = await apiService.getSatellites();
      const satelliteData: SatelliteData[] = allSatellites.map(sat => ({
        id: sat.id, name: sat.name || "", position: sat.position || "", age: sat.age || "",
        direction: sat.direction || "", carriers: sat.carriers || [],
        mappedLnb: sat.mappedLnb || "", mappedSwitch: sat.mappedSwitch || "", mappedMotor: sat.mappedMotor || ""
      }));
      setSatellites(satelliteData);
      // Update selected satellite if it exists
      if (selectedSatellite) {
        const updated = satelliteData.find(s => s.id === selectedSatellite.id);
        if (updated) setSelectedSatellite(updated);
      }
    } finally { setIsLoading(false); }
  };

  const loadEquipment = async () => {
    try {
      const [lnbs, switches, motors, unicables] = await Promise.all([
        apiService.getEquipment('lnbs'), apiService.getEquipment('switches'),
        apiService.getEquipment('motors'), apiService.getEquipment('unicables')
      ]);
      setAllLnbs(lnbs);
      setAllSwitches((switches || []).map((s: any) => ({
        ...s, switchOptions: Array.isArray(s.switchOptions) ? s.switchOptions : 
          (typeof s.switchOptions === 'string' ? (() => { try { return JSON.parse(s.switchOptions); } catch { return []; } })() : [])
      })));
      setAllMotors(motors);
      setAllUnicables(unicables);
    } catch {}
  };

  const handleAdd = () => {
    setEditingSatellite(null);
    setFormData({ carriers: [] });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEdit = (satellite: SatelliteData) => {
    setEditingSatellite(satellite);
    setFormData({ ...satellite });
    setIsDialogOpen(true);
  };

  const handleRowClick = (satellite: SatelliteData) => {
    setSelectedSatellite(satellite);
    setIsDetailDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      if (deleteTarget.type === 'satellite') {
        const satellite = satellites.find(s => s.id === deleteTarget.id);
        await apiService.deleteEquipment('satellites', deleteTarget.id);
        await apiService.logActivity(username, "Satellite Deleted", `Deleted satellite: ${satellite?.name}`, 'global');
        if (selectedSatellite?.id === deleteTarget.id) { setSelectedSatellite(null); setIsDetailDialogOpen(false); }
        await loadSatellites();
        toast({ title: "Satellite Deleted" });
      } else if (deleteTarget.type === 'carrier' && selectedSatellite) {
        const updatedCarriers = selectedSatellite.carriers.filter(c => c.id !== deleteTarget.id);
        const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
        await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
        setSelectedSatellite(updatedSatellite);
        await loadSatellites();
        toast({ title: "Carrier Deleted" });
      } else if (deleteTarget.type === 'service' && selectedSatellite && deleteTarget.carrierId) {
        const updatedCarriers = selectedSatellite.carriers.map(c => {
          if (c.id === deleteTarget.carrierId) return { ...c, services: c.services.filter(s => s.id !== deleteTarget.id) };
          return c;
        });
        const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
        await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
        setSelectedSatellite(updatedSatellite);
        await loadSatellites();
        toast({ title: "Service Deleted" });
      }
    } finally { setIsSaving(false); setDeleteTarget(null); }
  };

  const validateSatelliteForm = async (): Promise<boolean> => {
    if (!formData.name?.trim()) { toast({ title: "Validation Error", description: "Satellite name is required.", variant: "destructive" }); return false; }
    if (!formData.position?.trim()) { toast({ title: "Validation Error", description: "Position is required.", variant: "destructive" }); return false; }
    const isDuplicate = await apiService.checkSatelliteDuplicate(formData.name, editingSatellite?.id);
    if (isDuplicate) { toast({ title: "Duplicate Name", description: "A satellite with this name already exists.", variant: "destructive" }); return false; }
    return true;
  };

  const handleSave = async () => {
    const isValid = await validateSatelliteForm();
    if (!isValid) return;
    setIsSaving(true);
    try {
      const satelliteData = {
        name: formData.name!, position: formData.position!, age: formData.age || "",
        direction: formData.direction || "", carriers: formData.carriers || [],
        mappedLnb: formData.mappedLnb || "", mappedSwitch: formData.mappedSwitch || "", mappedMotor: formData.mappedMotor || ""
      };
      if (editingSatellite) {
        await apiService.updateSatellite(editingSatellite.id, satelliteData);
        await apiService.logActivity(username, "Satellite Updated", `Updated satellite: ${formData.name}`, 'global');
        toast({ title: "Satellite Updated" });
      } else {
        await apiService.saveSatellite(satelliteData);
        await apiService.logActivity(username, "Satellite Added", `Added new satellite: ${formData.name}`, 'global');
        toast({ title: "Satellite Added" });
      }
      await loadSatellites();
      setIsDialogOpen(false);
      setFormData({});
    } finally { setIsSaving(false); }
  };

  // Inline carrier add
  const handleStartAddCarrier = () => {
    setNewCarrierRow({ name: "", frequency: "", polarization: "Horizontal", symbolRate: "", fec: "Auto", fecMode: "Auto", factoryDefault: false, services: [] });
  };

  const handleSaveInlineCarrier = async () => {
    if (!selectedSatellite || !newCarrierRow?.name?.trim() || !newCarrierRow?.frequency?.trim()) {
      toast({ title: "Validation Error", description: "Carrier name and frequency are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const newCarrier: Carrier = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newCarrierRow.name!, frequency: newCarrierRow.frequency!,
        polarization: newCarrierRow.polarization || "Horizontal", symbolRate: newCarrierRow.symbolRate || "",
        fec: newCarrierRow.fec || "Auto", fecMode: newCarrierRow.fecMode || "Auto",
        factoryDefault: newCarrierRow.factoryDefault || false, services: []
      };
      const updatedSatellite = { ...selectedSatellite, carriers: [...selectedSatellite.carriers, newCarrier] };
      await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
      setSelectedSatellite(updatedSatellite);
      setNewCarrierRow(null);
      await loadSatellites();
      toast({ title: "Carrier Added" });
    } finally { setIsSaving(false); }
  };

  // Inline service add
  const handleStartAddService = (carrierId: string) => {
    setNewServiceRows(prev => ({ ...prev, [carrierId]: { name: "", frequency: "", videoPid: "", audioPid: "", pcrPid: "", programNumber: "", favGroup: "", factoryDefault: false, preference: "", scramble: false } }));
  };

  const handleSaveInlineService = async (carrierId: string) => {
    const svcData = newServiceRows[carrierId];
    if (!selectedSatellite || !svcData?.name?.trim()) {
      toast({ title: "Validation Error", description: "Service name is required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const carrier = selectedSatellite.carriers.find(c => c.id === carrierId);
      const newService: Service = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: svcData.name!, frequency: svcData.frequency || carrier?.frequency || "",
        videoPid: svcData.videoPid || "", audioPid: svcData.audioPid || "", pcrPid: svcData.pcrPid || "",
        programNumber: svcData.programNumber || "", favGroup: svcData.favGroup || "",
        factoryDefault: svcData.factoryDefault || false, preference: svcData.preference || "", scramble: svcData.scramble || false
      };
      const updatedCarriers = selectedSatellite.carriers.map(c => {
        if (c.id === carrierId) return { ...c, services: [...c.services, newService] };
        return c;
      });
      const updatedSatellite = { ...selectedSatellite, carriers: updatedCarriers };
      await apiService.updateSatellite(selectedSatellite.id, updatedSatellite);
      setSelectedSatellite(updatedSatellite);
      setNewServiceRows(prev => ({ ...prev, [carrierId]: null }));
      await loadSatellites();
      toast({ title: "Service Added" });
    } finally { setIsSaving(false); }
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
    await loadSatellites();
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
          <p className="text-muted-foreground mt-1">Configure satellites with carriers, services, and equipment mappings</p>
        </div>
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Satellite
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-3 text-lg text-muted-foreground">Loading satellites...</span>
        </div>
      ) : (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Satellites <Badge variant="secondary">{filteredSatellites.length}</Badge>
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filter satellites..." value={satelliteFilter} onChange={(e) => setSatelliteFilter(e.target.value)} className="pl-9" />
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
                      <TableRow key={satellite.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleRowClick(satellite)}>
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
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(satellite)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'satellite', id: satellite.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
      )}

      {/* Satellite Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Select value={formData.direction || "none"} onValueChange={(v) => setFormData({ ...formData, direction: v === "none" ? "" : v })}>
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

      {/* Satellite Detail Popup - replaces the card below */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedSatellite && (
            <>
              <DialogHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Satellite className="h-5 w-5 text-primary" />
                      {selectedSatellite.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selectedSatellite.position} {selectedSatellite.direction}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedSatellite.carriers?.length || 0} Carriers</Badge>
                    <Badge variant="secondary">{getTotalServices(selectedSatellite)} Services</Badge>
                    <Button variant="outline" size="sm" onClick={handleOpenEquipmentDialog}>
                      <Settings className="h-4 w-4 mr-1" /> Equipment
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Equipment Summary */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
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

              {/* Carriers with Accordion + inline service add */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <h3 className="font-semibold">Carriers</h3>
                <Button size="sm" onClick={handleStartAddCarrier}>
                  <Plus className="h-4 w-4 mr-1" /> Add Carrier
                </Button>
              </div>

              {/* Inline new carrier row */}
              {newCarrierRow && (
                <div className="border rounded-lg p-3 mb-3 bg-primary/5">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-muted-foreground">Name *</label>
                      <Input value={newCarrierRow.name || ""} onChange={(e) => setNewCarrierRow({ ...newCarrierRow, name: e.target.value })} placeholder="Carrier name" className="h-8" />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground">Freq (MHz) *</label>
                      <Input value={newCarrierRow.frequency || ""} onChange={(e) => setNewCarrierRow({ ...newCarrierRow, frequency: e.target.value })} placeholder="10773" className="h-8" />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground">Polarization</label>
                      <Select value={newCarrierRow.polarization || "Horizontal"} onValueChange={(v) => setNewCarrierRow({ ...newCarrierRow, polarization: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{polarizations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-muted-foreground">Symbol Rate</label>
                      <Input value={newCarrierRow.symbolRate || ""} onChange={(e) => setNewCarrierRow({ ...newCarrierRow, symbolRate: e.target.value })} placeholder="22000" className="h-8" />
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-muted-foreground">FEC</label>
                      <Select value={newCarrierRow.fec || "Auto"} onValueChange={(v) => setNewCarrierRow({ ...newCarrierRow, fec: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{fecOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-muted-foreground">FEC Mode</label>
                      <Select value={newCarrierRow.fecMode || "Auto"} onValueChange={(v) => setNewCarrierRow({ ...newCarrierRow, fecMode: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{fecModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8" onClick={handleSaveInlineCarrier} disabled={isSaving}>
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setNewCarrierRow(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSatellite.carriers.length === 0 && !newCarrierRow ? (
                <p className="text-center text-muted-foreground py-8">No carriers. Click "Add Carrier" to create one.</p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {selectedSatellite.carriers.map((carrier) => (
                    <AccordionItem key={carrier.id} value={carrier.id} className="border rounded-lg mb-2">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className="font-medium">{carrier.name}</span>
                          <Badge variant="outline" className="text-xs">{carrier.frequency} MHz</Badge>
                          <Badge variant="outline" className="text-xs">{carrier.polarization}</Badge>
                          <Badge variant="secondary" className="text-xs">{carrier.services?.length || 0} services</Badge>
                          <div className="ml-auto flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'carrier', id: carrier.id })}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-muted/20 rounded-lg text-sm">
                          <div><span className="text-muted-foreground">Symbol Rate:</span> {carrier.symbolRate || '-'}</div>
                          <div><span className="text-muted-foreground">FEC:</span> {carrier.fec || '-'}</div>
                          <div><span className="text-muted-foreground">FEC Mode:</span> {carrier.fecMode || '-'}</div>
                          <div><span className="text-muted-foreground">Factory Default:</span> {carrier.factoryDefault ? 'Yes' : 'No'}</div>
                        </div>

                        {/* Services */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">Services ({carrier.services?.length || 0})</h4>
                          <Button size="sm" variant="outline" onClick={() => handleStartAddService(carrier.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Add Service
                          </Button>
                        </div>

                        {/* Inline new service row */}
                        {newServiceRows[carrier.id] && (
                          <div className="border rounded-lg p-3 mb-3 bg-primary/5">
                            <div className="flex gap-2 items-end flex-wrap">
                              <div className="flex-1 min-w-[100px]">
                                <label className="text-xs text-muted-foreground">Name *</label>
                                <Input value={newServiceRows[carrier.id]?.name || ""} onChange={(e) => setNewServiceRows(prev => ({ ...prev, [carrier.id]: { ...prev[carrier.id]!, name: e.target.value } }))} placeholder="Service name" className="h-8" />
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-muted-foreground">Video PID</label>
                                <Input value={newServiceRows[carrier.id]?.videoPid || ""} onChange={(e) => setNewServiceRows(prev => ({ ...prev, [carrier.id]: { ...prev[carrier.id]!, videoPid: e.target.value } }))} placeholder="5500" className="h-8" />
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-muted-foreground">Audio PID</label>
                                <Input value={newServiceRows[carrier.id]?.audioPid || ""} onChange={(e) => setNewServiceRows(prev => ({ ...prev, [carrier.id]: { ...prev[carrier.id]!, audioPid: e.target.value } }))} placeholder="5501" className="h-8" />
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-muted-foreground">PCR PID</label>
                                <Input value={newServiceRows[carrier.id]?.pcrPid || ""} onChange={(e) => setNewServiceRows(prev => ({ ...prev, [carrier.id]: { ...prev[carrier.id]!, pcrPid: e.target.value } }))} placeholder="5500" className="h-8" />
                              </div>
                              <div className="w-24">
                                <label className="text-xs text-muted-foreground">Program #</label>
                                <Input value={newServiceRows[carrier.id]?.programNumber || ""} onChange={(e) => setNewServiceRows(prev => ({ ...prev, [carrier.id]: { ...prev[carrier.id]!, programNumber: e.target.value } }))} placeholder="6940" className="h-8" />
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" className="h-8" onClick={() => handleSaveInlineService(carrier.id)} disabled={isSaving}>
                                  <Save className="h-3 w-3 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setNewServiceRows(prev => ({ ...prev, [carrier.id]: null }))}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {(carrier.services?.length || 0) === 0 && !newServiceRows[carrier.id] ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No services. Click "Add Service" to add one.</p>
                        ) : (
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Video PID</TableHead>
                                  <TableHead>Audio PID</TableHead>
                                  <TableHead>PCR PID</TableHead>
                                  <TableHead>Program #</TableHead>
                                  <TableHead>Scramble</TableHead>
                                  <TableHead className="w-16">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {carrier.services?.map((service, sIdx) => (
                                  <TableRow key={service.id} className="hover:bg-muted/30">
                                    <TableCell>{sIdx + 1}</TableCell>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell>{service.videoPid || '-'}</TableCell>
                                    <TableCell>{service.audioPid || '-'}</TableCell>
                                    <TableCell>{service.pcrPid || '-'}</TableCell>
                                    <TableCell>{service.programNumber || '-'}</TableCell>
                                    <TableCell>{service.scramble ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                                    <TableCell>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget({ type: 'service', id: service.id, carrierId: carrier.id })}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Equipment Mapping Modal */}
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

export default SatelliteManagement;
