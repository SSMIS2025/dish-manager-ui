import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  FolderOpen, Radio, Zap, RotateCcw, Activity, Satellite, Loader2, FileCode, Download, Package,
  ChevronRight, Settings, FileText, Search, Edit, Save, Eye, Plus, Trash2, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { exportService } from "@/services/exportService";
import InlineFormField from "@/components/InlineFormField";
import {
  DEFAULT_LNB_BANDS, LNB_POWER_CONTROLS, LNB_V_CONTROLS, LNB_KHZ_OPTIONS,
  DEFAULT_SWITCH_TYPES, DEFAULT_MOTOR_TYPES, MOTOR_EAST_WEST, MOTOR_NORTH_SOUTH,
  DEFAULT_UNICABLE_TYPES, UNICABLE_STATUS_OPTIONS, UNICABLE_PORT_OPTIONS,
  SATELLITE_DIRECTIONS, POLARIZATIONS, FEC_OPTIONS, FEC_MODES, getMergedTypes
} from "@/config/equipmentTypes";

interface ProjectMappingProps {
  username: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Build {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  xmlData?: string;
}

const ProjectMapping = ({ username }: ProjectMappingProps) => {
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBuildId, setSelectedBuildId] = useState<string>('');
  
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState<string | null>(null);
  const [isGeneratingBin, setIsGeneratingBin] = useState(false);
  const [isUpdatingEquipment, setIsUpdatingEquipment] = useState(false);
  
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  
  const [buildMappings, setBuildMappings] = useState<any[]>([]);
  
  const [lnbSearch, setLnbSearch] = useState("");
  const [switchSearch, setSwitchSearch] = useState("");
  const [motorSearch, setMotorSearch] = useState("");
  const [unicableSearch, setUnicableSearch] = useState("");
  const [satelliteSearch, setSatelliteSearch] = useState("");
  
  const [activeTab, setActiveTab] = useState("lnbs");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string>("");
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [viewingType, setViewingType] = useState<string>("");
  
  const [isSatelliteDialogOpen, setIsSatelliteDialogOpen] = useState(false);
  const [satEditData, setSatEditData] = useState<any>(null);
  const [isSavingSatellite, setIsSavingSatellite] = useState(false);
  
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const lnbBandTypes = getMergedTypes(DEFAULT_LNB_BANDS, apiService.getCustomTypes('lnb_band'));
  const switchTypes = getMergedTypes(DEFAULT_SWITCH_TYPES, apiService.getCustomTypes('switch_type'));
  const motorTypes = getMergedTypes(DEFAULT_MOTOR_TYPES, apiService.getCustomTypes('motor_type'));
  const unicableTypes = getMergedTypes(DEFAULT_UNICABLE_TYPES, apiService.getCustomTypes('unicable_type'));

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadBuilds(selectedProjectId);
      setSelectedBuildId('');
      setBuildMappings([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const loadBuildContext = async () => {
      if (selectedBuildId) {
        await Promise.all([
          loadBuildMappings(selectedBuildId),
          loadAllEquipment(selectedBuildId)
        ]);
      } else {
        setBuildMappings([]);
        await loadAllEquipment();
      }
    };
    loadBuildContext();
  }, [selectedBuildId]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const data = await apiService.getProjects();
      setProjects(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load projects", variant: "destructive" });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadBuilds = async (projectId: string) => {
    setIsLoadingBuilds(true);
    try {
      const data = await apiService.getProjectBuilds(projectId);
      setBuilds(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load builds", variant: "destructive" });
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  const loadAllEquipment = async (buildId?: string) => {
    setIsLoadingEquipment(true);
    try {
      const [lnbs, switches, motors, unicables, satellites] = await Promise.all([
        apiService.getEquipmentWithOverrides('lnbs', buildId || ''),
        apiService.getEquipmentWithOverrides('switches', buildId || ''),
        apiService.getEquipmentWithOverrides('motors', buildId || ''),
        apiService.getEquipmentWithOverrides('unicables', buildId || ''),
        apiService.getEquipmentWithOverrides('satellites', buildId || '')
      ]);
      setAllLnbs(lnbs || []);
      setAllSwitches(switches || []);
      setAllMotors(motors || []);
      setAllUnicables(unicables || []);
      setAllSatellites(satellites || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const loadBuildMappings = async (buildId: string) => {
    setIsLoadingMappings(true);
    try {
      const mappings = await apiService.getBuildMappings(buildId);
      setBuildMappings(mappings || []);
    } catch (error) {
      console.error('Failed to load build mappings:', error);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  const handleToggleMapping = async (equipmentType: string, equipmentId: string) => {
    if (!selectedBuildId) {
      toast({ title: "Error", description: "Please select a build first", variant: "destructive" });
      return;
    }
    setIsSavingMapping(`${equipmentType}-${equipmentId}`);
    try {
      const existingMapping = buildMappings.find(m => m.equipmentType === equipmentType && m.equipmentId === equipmentId);
      if (existingMapping) {
        await apiService.removeBuildMapping(selectedBuildId, equipmentType, equipmentId);
        setBuildMappings(prev => prev.filter(m => !(m.equipmentType === equipmentType && m.equipmentId === equipmentId)));
        toast({ title: "Removed", description: "Equipment removed from build." });
      } else {
        await apiService.addBuildMapping(selectedBuildId, equipmentType, equipmentId);
        setBuildMappings(prev => [...prev, { buildId: selectedBuildId, equipmentType, equipmentId }]);
        toast({ title: "Added", description: "Equipment added to build." });
      }
      await apiService.logActivity(username, existingMapping ? "Mapping Removed" : "Mapping Added", `${existingMapping ? 'Removed' : 'Added'} ${equipmentType} mapping to build`, selectedProjectId);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update mapping", variant: "destructive" });
    } finally {
      setIsSavingMapping(null);
    }
  };

  const isMapped = (equipmentType: string, equipmentId: string) => {
    return buildMappings.some(m => m.equipmentType === equipmentType && m.equipmentId === equipmentId);
  };

  const getMappingCount = (equipmentType: string) => {
    return buildMappings.filter(m => m.equipmentType === equipmentType).length;
  };

  const handleOpenEdit = (item: any, type: string) => {
    setEditingItem(item);
    setEditingType(type);
    setEditFormData({ ...item });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingType) return;
    setIsUpdatingEquipment(true);
    try {
      if (selectedBuildId) {
        // Save as build-specific override - doesn't affect global data
        await apiService.setMappingOverride(selectedBuildId, editingType, editingItem.id, editFormData);
        // Update local state immediately
        const updateList = (list: any[], setList: (l: any[]) => void) => {
          setList(list.map(item => item.id === editingItem.id ? { ...item, ...editFormData, id: item.id } : item));
        };
        if (editingType === 'lnbs') updateList(allLnbs, setAllLnbs);
        else if (editingType === 'switches') updateList(allSwitches, setAllSwitches);
        else if (editingType === 'motors') updateList(allMotors, setAllMotors);
        else if (editingType === 'unicables') updateList(allUnicables, setAllUnicables);
        toast({ title: "Updated", description: "Equipment override saved for this build (global data unchanged)." });
      } else {
        await apiService.updateEquipment(editingType, editingItem.id, editFormData);
        await loadAllEquipment();
        toast({ title: "Updated", description: "Equipment updated globally." });
      }
      setEditDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update equipment.", variant: "destructive" });
    } finally {
      setIsUpdatingEquipment(false);
    }
  };

  const handleOpenView = (item: any, type: string) => {
    setViewingItem(item);
    setViewingType(type);
    setViewDialogOpen(true);
  };

  const handleOpenSatelliteEdit = (sat: any) => {
    setSatEditData(JSON.parse(JSON.stringify(sat)));
    setIsSatelliteDialogOpen(true);
  };

  const handleSaveSatelliteEdit = async () => {
    if (!satEditData) return;
    setIsSavingSatellite(true);
    try {
      if (selectedBuildId) {
        await apiService.setMappingOverride(selectedBuildId, 'satellites', satEditData.id, satEditData);
        setAllSatellites(prev => prev.map(s => s.id === satEditData.id ? { ...s, ...satEditData, id: s.id } : s));
        toast({ title: "Updated", description: "Satellite override saved for this build (global data unchanged)." });
      } else {
        await apiService.updateSatellite(satEditData.id, satEditData);
        await loadAllEquipment();
        toast({ title: "Updated", description: "Satellite updated globally." });
      }
      setIsSatelliteDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to update satellite.", variant: "destructive" });
    } finally {
      setIsSavingSatellite(false);
    }
  };

  const addCarrierToSatEdit = () => {
    const newCarrier = { id: `c-${Date.now()}`, name: "", frequency: "", polarization: "", symbolRate: "", fec: "", fecMode: "", modulationType: "", tsid: "", onid: "", networkId: "", services: [] };
    setSatEditData({ ...satEditData, carriers: [...(satEditData.carriers || []), newCarrier] });
  };

  const removeCarrierFromSatEdit = (idx: number) => {
    setSatEditData({ ...satEditData, carriers: (satEditData.carriers || []).filter((_: any, i: number) => i !== idx) });
  };

  const updateCarrierInSatEdit = (idx: number, field: string, value: any) => {
    const carriers = [...(satEditData.carriers || [])];
    carriers[idx] = { ...carriers[idx], [field]: value };
    setSatEditData({ ...satEditData, carriers });
  };

  const addServiceToCarrier = (carrierIdx: number) => {
    const carriers = [...(satEditData.carriers || [])];
    const newService = { id: `s-${Date.now()}`, name: "", serviceType: "", videoPid: "", audioPid: "", pcrPid: "", programNumber: "", favGroup: "", factoryDefault: false };
    carriers[carrierIdx] = { ...carriers[carrierIdx], services: [...(carriers[carrierIdx].services || []), newService] };
    setSatEditData({ ...satEditData, carriers });
  };

  const removeServiceFromCarrier = (carrierIdx: number, serviceIdx: number) => {
    const carriers = [...(satEditData.carriers || [])];
    carriers[carrierIdx] = { ...carriers[carrierIdx], services: carriers[carrierIdx].services.filter((_: any, i: number) => i !== serviceIdx) };
    setSatEditData({ ...satEditData, carriers });
  };

  const updateServiceInCarrier = (carrierIdx: number, serviceIdx: number, field: string, value: any) => {
    const carriers = [...(satEditData.carriers || [])];
    const services = [...carriers[carrierIdx].services];
    services[serviceIdx] = { ...services[serviceIdx], [field]: value };
    carriers[carrierIdx] = { ...carriers[carrierIdx], services };
    setSatEditData({ ...satEditData, carriers });
  };

  const filteredLnbs = allLnbs.filter(l => l.name?.toLowerCase().includes(lnbSearch.toLowerCase()) || l.bandType?.toLowerCase().includes(lnbSearch.toLowerCase()));
  const filteredSwitches = allSwitches.filter(s => s.switchType?.toLowerCase().includes(switchSearch.toLowerCase()));
  const filteredMotors = allMotors.filter(m => m.motorType?.toLowerCase().includes(motorSearch.toLowerCase()));
  const filteredUnicables = allUnicables.filter(u => u.unicableType?.toLowerCase().includes(unicableSearch.toLowerCase()));
  const filteredSatellites = allSatellites.filter(s => s.name?.toLowerCase().includes(satelliteSearch.toLowerCase()) || s.position?.toLowerCase().includes(satelliteSearch.toLowerCase()));

  const generateBuildXML = (): string => {
    const selectedBuild = builds.find(b => b.id === selectedBuildId);
    if (!selectedBuild) return "";
    const mappedLnbs = allLnbs.filter(l => isMapped('lnbs', l.id));
    const mappedSwitches = allSwitches.filter(s => isMapped('switches', s.id));
    const mappedMotors = allMotors.filter(m => isMapped('motors', m.id));
    const mappedUnicables = allUnicables.filter(u => isMapped('unicables', u.id));
    const mappedSats = allSatellites.filter(s => isMapped('satellites', s.id));

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<SDB>\n  <projinfo>\n`;
    xml += `    <projname>${selectedBuild.name}</projname>\n`;
    mappedLnbs.forEach(l => {
      xml += `    <LNBlock>\n      <name>${l.name}</name>\n      <LowFrequency>${l.lowFrequency || ''}</LowFrequency>\n      <HighFrequency>${l.highFrequency || ''}</HighFrequency>\n      <LO1High>${l.lo1High || ''}</LO1High>\n      <LO1Low>${l.lo1Low || ''}</LO1Low>\n      <BandType>${l.bandType || ''}</BandType>\n      <PowerControl>${l.powerControl || ''}</PowerControl>\n      <VControl>${l.vControl || ''}</VControl>\n      <KhzOption>${l.khzOption || ''}</KhzOption>\n    </LNBlock>\n`;
    });
    mappedSwitches.forEach(s => {
      xml += `    <switchblock>\n      <type>${s.switchType || ''}</type>\n`;
      const options = Array.isArray(s.switchOptions) ? s.switchOptions : [];
      options.forEach((opt: string, idx: number) => { xml += `      <option${idx + 1}>${opt}</option${idx + 1}>\n`; });
      xml += `    </switchblock>\n`;
    });
    mappedMotors.forEach(m => {
      xml += `    <motor>\n      <type>${m.motorType || ''}</type>\n`;
      if (m.motorType === 'DiSEqC 1.0') { xml += `      <position>${m.position || ''}</position>\n`; }
      else { xml += `      <longitude>${m.longitude || ''}</longitude>\n      <latitude>${m.latitude || ''}</latitude>\n      <eastWest>${m.eastWest || ''}</eastWest>\n      <northSouth>${m.northSouth || ''}</northSouth>\n`; }
      xml += `    </motor>\n`;
    });
    mappedUnicables.forEach(u => {
      xml += `    <unicable>\n      <type>${u.unicableType || ''}</type>\n      <status>${u.status || ''}</status>\n`;
      if (u.unicableType === 'DSCR') xml += `      <port>${u.port || ''}</port>\n`;
      const slots = Array.isArray(u.ifSlots) ? u.ifSlots : [];
      slots.forEach((slot: string, idx: number) => { xml += `      <slot${idx + 1}>${slot}</slot${idx + 1}>\n`; });
      xml += `    </unicable>\n`;
    });
    if (mappedSats.length > 0) {
      xml += `    <sattliteblock>\n`;
      mappedSats.forEach(sat => {
        xml += `      <sattliteinfo>\n        <name>${sat.name}</name>\n        <position>${sat.position || ''}</position>\n        <direction>${sat.direction || ''}</direction>\n`;
        (sat.carriers || []).forEach((c: any) => {
          xml += `        <carrers>\n          <name>${c.name}</name>\n          <frequency>${c.frequency || ''}</frequency>\n          <polarization>${c.polarization || ''}</polarization>\n          <symbolRate>${c.symbolRate || ''}</symbolRate>\n          <fec>${c.fec || ''}</fec>\n`;
          (c.services || []).forEach((s: any) => {
            xml += `          <services>\n            <name>${s.name}</name>\n            <videoPid>${s.videoPid || ''}</videoPid>\n            <audioPid>${s.audioPid || ''}</audioPid>\n            <pcrPid>${s.pcrPid || ''}</pcrPid>\n            <programNumber>${s.programNumber || ''}</programNumber>\n          </services>\n`;
          });
          xml += `        </carrers>\n`;
        });
        xml += `      </sattliteinfo>\n`;
      });
      xml += `    </sattliteblock>\n`;
    }
    xml += `  </projinfo>\n</SDB>`;
    return xml;
  };

  const handleGenerateBin = async () => {
    if (!selectedBuildId) return;
    setIsGeneratingBin(true);
    try {
      const xmlData = generateBuildXML();
      await apiService.updateProjectBuild(selectedBuildId, { xmlData });
      const result = await apiService.generateBin(xmlData);
      if (result.success && result.data) {
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const selectedBuild = builds.find(b => b.id === selectedBuildId);
        a.download = `${(selectedBuild?.name || 'build').replace(/\s+/g, '_')}.bin`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "Success", description: "BIN file generated and downloaded." });
      } else {
        const blob = new Blob([xmlData], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const selectedBuild = builds.find(b => b.id === selectedBuildId);
        a.download = `${(selectedBuild?.name || 'build').replace(/\s+/g, '_')}_config.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "XML Downloaded", description: result.error || "BIN generation requires bundled executables. XML downloaded instead." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate BIN file", variant: "destructive" });
    } finally {
      setIsGeneratingBin(false);
    }
  };

  const handleExportPDF = () => {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedBuild = builds.find(b => b.id === selectedBuildId);
    if (!selectedProject || !selectedBuild) return;
    exportService.exportToPDF(
      { ...selectedProject, name: `${selectedProject.name} - ${selectedBuild.name}` },
      buildMappings,
      { lnbs: allLnbs, switches: allSwitches, motors: allMotors, unicables: allUnicables, satellites: allSatellites }
    );
    toast({ title: "Export Complete", description: "PDF export opened in new window." });
  };

  const handleExportExcel = () => {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedBuild = builds.find(b => b.id === selectedBuildId);
    if (!selectedProject || !selectedBuild) return;
    exportService.exportToExcel(
      { ...selectedProject, name: `${selectedProject.name} - ${selectedBuild.name}` },
      buildMappings,
      { lnbs: allLnbs, switches: allSwitches, motors: allMotors, unicables: allUnicables, satellites: allSatellites }
    );
    toast({ title: "Export Complete", description: "Excel file downloaded." });
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedBuild = builds.find(b => b.id === selectedBuildId);

  const getMappedEquipment = () => ({
    lnbs: allLnbs.filter(l => isMapped('lnbs', l.id)),
    switches: allSwitches.filter(s => isMapped('switches', s.id)),
    motors: allMotors.filter(m => isMapped('motors', m.id)),
    unicables: allUnicables.filter(u => isMapped('unicables', u.id)),
    satellites: allSatellites.filter(s => isMapped('satellites', s.id))
  });

  const renderEquipmentTable = (items: any[], type: string, columns: { key: string; label: string }[]) => {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12">Map</TableHead>
              <TableHead className="w-12">#</TableHead>
              {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 3} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
            ) : (
              items.map((item, index) => {
                const mapped = isMapped(type, item.id);
                const saving = isSavingMapping === `${type}-${item.id}`;
                return (
                  <TableRow key={item.id} className={mapped ? 'bg-primary/5' : 'hover:bg-muted/30'}>
                    <TableCell>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox checked={mapped} onCheckedChange={() => handleToggleMapping(type, item.id)} />
                      )}
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key}>
                        {col.key === 'switchOptions' 
                          ? (Array.isArray(item[col.key]) ? item[col.key].join(', ') : '-')
                          : col.key === 'ifSlots'
                          ? `${(Array.isArray(item[col.key]) ? item[col.key] : []).length} slots`
                          : col.key === 'carriers'
                          ? <Badge variant="secondary">{(item[col.key] || []).length}</Badge>
                          : col.key === 'services'
                          ? <Badge variant="outline">{(item.carriers || []).reduce((s: number, c: any) => s + (c.services?.length || 0), 0)}</Badge>
                          : item[col.key] || '-'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenView(item, type)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                          if (type === 'satellites') {
                            handleOpenSatelliteEdit(item);
                          } else {
                            handleOpenEdit(item, type);
                          }
                        }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderViewContent = () => {
    if (!viewingItem) return null;
    const items: { label: string; value: any }[] = [];
    if (viewingType === 'lnbs') {
      items.push({ label: "Name", value: viewingItem.name }, { label: "Band Type", value: viewingItem.bandType }, { label: "Low Frequency", value: viewingItem.lowFrequency }, { label: "High Frequency", value: viewingItem.highFrequency }, { label: "Power Control", value: viewingItem.powerControl }, { label: "V Control", value: viewingItem.vControl }, { label: "22KHz", value: viewingItem.khzOption });
    } else if (viewingType === 'switches') {
      items.push({ label: "Type", value: viewingItem.switchType }, { label: "Options", value: Array.isArray(viewingItem.switchOptions) ? viewingItem.switchOptions.join(', ') : '-' });
    } else if (viewingType === 'motors') {
      items.push({ label: "Type", value: viewingItem.motorType });
      if (viewingItem.motorType === 'DiSEqC 1.0') { items.push({ label: "Position", value: viewingItem.position }); }
      else { items.push({ label: "Longitude", value: viewingItem.longitude }, { label: "Latitude", value: viewingItem.latitude }, { label: "E/W", value: viewingItem.eastWest }, { label: "N/S", value: viewingItem.northSouth }); }
    } else if (viewingType === 'unicables') {
      items.push({ label: "Type", value: viewingItem.unicableType }, { label: "Status", value: viewingItem.status }, { label: "Port", value: viewingItem.port }, { label: "IF Slots", value: `${(Array.isArray(viewingItem.ifSlots) ? viewingItem.ifSlots : []).length} slots` });
    } else if (viewingType === 'satellites') {
      items.push({ label: "Name", value: viewingItem.name }, { label: "Position", value: viewingItem.position }, { label: "Direction", value: viewingItem.direction }, { label: "Carriers", value: (viewingItem.carriers || []).length }, { label: "Services", value: (viewingItem.carriers || []).reduce((s: number, c: any) => s + (c.services?.length || 0), 0) });
    }
    return (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center border-b border-border pb-2 last:border-0">
            <span className="text-sm text-muted-foreground w-32 shrink-0">{item.label}:</span>
            <span className="text-sm font-medium">{item.value || '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderEditContent = () => {
    if (!editingItem || !editingType) return null;
    if (editingType === 'lnbs') {
      return (
        <div className="space-y-3">
          <InlineFormField label="Name"><Input value={editFormData.name || ""} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} /></InlineFormField>
          <InlineFormField label="Band Type">
            <Select value={editFormData.bandType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, bandType: v})}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{lnbBandTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          <InlineFormField label="Low Freq"><Input value={editFormData.lowFrequency || ""} onChange={(e) => setEditFormData({...editFormData, lowFrequency: e.target.value})} /></InlineFormField>
          <InlineFormField label="High Freq"><Input value={editFormData.highFrequency || ""} onChange={(e) => setEditFormData({...editFormData, highFrequency: e.target.value})} /></InlineFormField>
          <InlineFormField label="Power Control">
            <Select value={editFormData.powerControl || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, powerControl: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LNB_POWER_CONTROLS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          <InlineFormField label="V-Control">
            <Select value={editFormData.vControl || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, vControl: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LNB_V_CONTROLS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          <InlineFormField label="22KHz">
            <Select value={editFormData.khzOption || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, khzOption: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LNB_KHZ_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
        </div>
      );
    }
    if (editingType === 'switches') {
      return (
        <div className="space-y-3">
          <InlineFormField label="Type">
           <Select value={editFormData.switchType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, switchType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{switchTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          <div>
            <p className="text-xs font-medium mb-2">Options</p>
            {(editFormData.switchOptions || []).map((opt: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <Input value={opt} onChange={(e) => { const newOpts = [...(editFormData.switchOptions || [])]; newOpts[idx] = e.target.value; setEditFormData({...editFormData, switchOptions: newOpts}); }} className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditFormData({...editFormData, switchOptions: (editFormData.switchOptions || []).filter((_: any, i: number) => i !== idx)})}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setEditFormData({...editFormData, switchOptions: [...(editFormData.switchOptions || []), ""]})}><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </div>
        </div>
      );
    }
    if (editingType === 'motors') {
      return (
        <div className="space-y-3">
          <InlineFormField label="Type">
            <Select value={editFormData.motorType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, motorType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{motorTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          {editFormData.motorType === "DiSEqC 1.0" && (
            <InlineFormField label="Position"><Input value={editFormData.position || ""} onChange={(e) => setEditFormData({...editFormData, position: e.target.value})} /></InlineFormField>
          )}
          {editFormData.motorType === "DiSEqC 1.2" && (
            <>
              <InlineFormField label="Longitude"><Input value={editFormData.longitude || ""} onChange={(e) => setEditFormData({...editFormData, longitude: e.target.value})} /></InlineFormField>
              <InlineFormField label="Latitude"><Input value={editFormData.latitude || ""} onChange={(e) => setEditFormData({...editFormData, latitude: e.target.value})} /></InlineFormField>
              <InlineFormField label="E/W">
                <Select value={editFormData.eastWest || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, eastWest: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NONE">Select</SelectItem>{MOTOR_EAST_WEST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </InlineFormField>
              <InlineFormField label="N/S">
                <Select value={editFormData.northSouth || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, northSouth: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NONE">Select</SelectItem>{MOTOR_NORTH_SOUTH.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </InlineFormField>
            </>
          )}
        </div>
      );
    }
    if (editingType === 'unicables') {
      const slots = Array.isArray(editFormData.ifSlots) ? editFormData.ifSlots : [];
      return (
        <div className="space-y-3">
          <InlineFormField label="Type">
            <Select value={editFormData.unicableType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, unicableType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{unicableTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          <InlineFormField label="Status">
            <Select value={editFormData.status || "OFF"} onValueChange={(v) => setEditFormData({...editFormData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNICABLE_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </InlineFormField>
          {editFormData.unicableType === "DSCR" && (
            <InlineFormField label="Port">
              <Select value={editFormData.port || "None"} onValueChange={(v) => setEditFormData({...editFormData, port: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNICABLE_PORT_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </InlineFormField>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">IF Slots ({slots.length}/32)</span>
              <Button type="button" variant="outline" size="sm" disabled={slots.length >= 32}
                onClick={() => setEditFormData({...editFormData, ifSlots: [...slots, { slotNumber: slots.length + 1, frequency: "" }]})}>
                <Plus className="h-3 w-3 mr-1" /> Add Slot
              </Button>
            </div>
            {slots.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                {slots.map((slot: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Slot {slot.slotNumber || idx + 1}</span>
                    <Input className="h-7 text-xs flex-1" value={slot.frequency || ""} placeholder="IF Frequency (MHz)"
                      onChange={(e) => { const newSlots = [...slots]; newSlots[idx] = { ...newSlots[idx], frequency: e.target.value }; setEditFormData({...editFormData, ifSlots: newSlots}); }} />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => setEditFormData({...editFormData, ifSlots: slots.filter((_: any, i: number) => i !== idx)})}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            Project Mapping
          </h2>
          <p className="text-muted-foreground mt-1">Map and configure equipment for project builds</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Project">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={isLoadingProjects ? "Loading..." : "Select a project"} /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </InlineFormField>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Build">
                <Select value={selectedBuildId} onValueChange={setSelectedBuildId} disabled={!selectedProjectId || isLoadingBuilds}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={!selectedProjectId ? "Select project first" : isLoadingBuilds ? "Loading builds..." : builds.length === 0 ? "No builds available" : "Select a build"} /></SelectTrigger>
                  <SelectContent>{builds.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </InlineFormField>
            </div>
            {selectedBuildId && (
              <div className="flex gap-2 items-end">
                <Button variant="outline" size="sm" onClick={() => setIsReportDialogOpen(true)}><BarChart3 className="mr-1 h-4 w-4" />Report</Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="mr-1 h-4 w-4" />PDF</Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="mr-1 h-4 w-4" />Excel</Button>
                <Button size="sm" onClick={handleGenerateBin} disabled={isGeneratingBin}>
                  {isGeneratingBin ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileCode className="mr-1 h-4 w-4" />}
                  Generate BIN
                </Button>
              </div>
            )}
          </div>
          {selectedProject && selectedBuild && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedProject.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span>{selectedBuild.name}</span>
                <Badge variant="secondary" className="ml-auto">{buildMappings.length} equipment mapped</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBuildId ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">SDB Information - Equipment Mapping</CardTitle>
            <CardDescription>All equipment shown in table view. Use checkbox to map, eye to view details, edit to modify.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMappings || isLoadingEquipment ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading equipment...</span>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="lnbs" className="flex items-center gap-1"><Radio className="h-4 w-4" /><span className="hidden sm:inline">LNBs</span><Badge variant="outline" className="ml-1 text-xs">{getMappingCount('lnbs')}/{allLnbs.length}</Badge></TabsTrigger>
                  <TabsTrigger value="switches" className="flex items-center gap-1"><Zap className="h-4 w-4" /><span className="hidden sm:inline">Switches</span><Badge variant="outline" className="ml-1 text-xs">{getMappingCount('switches')}/{allSwitches.length}</Badge></TabsTrigger>
                  <TabsTrigger value="motors" className="flex items-center gap-1"><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Motors</span><Badge variant="outline" className="ml-1 text-xs">{getMappingCount('motors')}/{allMotors.length}</Badge></TabsTrigger>
                  <TabsTrigger value="unicables" className="flex items-center gap-1"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Unicables</span><Badge variant="outline" className="ml-1 text-xs">{getMappingCount('unicables')}/{allUnicables.length}</Badge></TabsTrigger>
                  <TabsTrigger value="satellites" className="flex items-center gap-1"><Satellite className="h-4 w-4" /><span className="hidden sm:inline">Satellites</span><Badge variant="outline" className="ml-1 text-xs">{getMappingCount('satellites')}/{allSatellites.length}</Badge></TabsTrigger>
                </TabsList>

                <TabsContent value="lnbs">
                  <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search LNBs..." value={lnbSearch} onChange={(e) => setLnbSearch(e.target.value)} className="pl-9" /></div>
                  {renderEquipmentTable(filteredLnbs, 'lnbs', [{ key: 'name', label: 'Name' }, { key: 'bandType', label: 'Band' }, { key: 'lowFrequency', label: 'Low Freq' }, { key: 'highFrequency', label: 'High Freq' }, { key: 'powerControl', label: 'Power' }, { key: 'khzOption', label: '22KHz' }])}
                </TabsContent>

                <TabsContent value="switches">
                  <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search Switches..." value={switchSearch} onChange={(e) => setSwitchSearch(e.target.value)} className="pl-9" /></div>
                  {renderEquipmentTable(filteredSwitches, 'switches', [{ key: 'switchType', label: 'Type' }, { key: 'switchOptions', label: 'Options' }])}
                </TabsContent>

                <TabsContent value="motors">
                  <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search Motors..." value={motorSearch} onChange={(e) => setMotorSearch(e.target.value)} className="pl-9" /></div>
                  {renderEquipmentTable(filteredMotors, 'motors', [{ key: 'motorType', label: 'Type' }, { key: 'position', label: 'Position' }, { key: 'longitude', label: 'Longitude' }, { key: 'latitude', label: 'Latitude' }])}
                </TabsContent>

                <TabsContent value="unicables">
                  <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search Unicables..." value={unicableSearch} onChange={(e) => setUnicableSearch(e.target.value)} className="pl-9" /></div>
                  {renderEquipmentTable(filteredUnicables, 'unicables', [{ key: 'unicableType', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'port', label: 'Port' }, { key: 'ifSlots', label: 'Slots' }])}
                </TabsContent>

                <TabsContent value="satellites">
                  <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search Satellites..." value={satelliteSearch} onChange={(e) => setSatelliteSearch(e.target.value)} className="pl-9" /></div>
                  {renderEquipmentTable(filteredSatellites, 'satellites', [{ key: 'name', label: 'Name' }, { key: 'position', label: 'Position' }, { key: 'direction', label: 'Direction' }, { key: 'carriers', label: 'Carriers' }, { key: 'services', label: 'Services' }])}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Build Selected</h3>
            <p className="text-center max-w-md">Select a project and build above to view and manage equipment mappings.</p>
          </CardContent>
        </Card>
      )}

      {/* View Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Equipment Details
            </DialogTitle>
            <DialogDescription>View equipment information.</DialogDescription>
          </DialogHeader>
          <div className="py-4">{renderViewContent()}</div>
        </DialogContent>
      </Dialog>

      {/* Edit Equipment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Equipment {selectedBuildId && <Badge variant="secondary" className="text-xs">Build Override</Badge>}
            </DialogTitle>
            <DialogDescription>Modify equipment details. {selectedBuildId ? 'Changes only affect this build.' : 'Changes apply globally.'}</DialogDescription>
          </DialogHeader>
          <div className="py-4">{renderEditContent()}</div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isUpdatingEquipment}>
              {isUpdatingEquipment ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Satellite Edit Dialog */}
      <Dialog open={isSatelliteDialogOpen} onOpenChange={setIsSatelliteDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              Edit Satellite - {satEditData?.name || ''}
              {selectedBuildId && <Badge variant="secondary" className="text-xs">Build Override</Badge>}
            </DialogTitle>
            <DialogDescription>Modify satellite, carriers, and services. {selectedBuildId ? 'Changes only affect this build.' : 'Changes apply globally.'}</DialogDescription>
          </DialogHeader>
          {satEditData && (
            <ScrollArea className="h-[70vh]">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm">Satellite Information</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <InlineFormField label="Name"><Input value={satEditData.name || ""} onChange={(e) => setSatEditData({...satEditData, name: e.target.value})} /></InlineFormField>
                    <InlineFormField label="Position"><Input value={satEditData.position || ""} onChange={(e) => setSatEditData({...satEditData, position: e.target.value})} /></InlineFormField>
                    <InlineFormField label="Direction">
                      <Select value={satEditData.direction || "none"} onValueChange={(v) => setSatEditData({...satEditData, direction: v === "none" ? "" : v})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Select</SelectItem>{SATELLITE_DIRECTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </InlineFormField>
                    <InlineFormField label="Status">
                      <Select value={satEditData.age || "none"} onValueChange={(v) => setSatEditData({...satEditData, age: v === "none" ? "" : v})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Select</SelectItem><SelectItem value="New">New</SelectItem><SelectItem value="Old">Old</SelectItem></SelectContent>
                      </Select>
                    </InlineFormField>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm">Equipment Mappings</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(() => {
                      const mappedLnbIds = buildMappings.filter(m => m.equipmentType === 'lnbs').map(m => m.equipmentId);
                      const mappedSwitchIds = buildMappings.filter(m => m.equipmentType === 'switches').map(m => m.equipmentId);
                      const mappedMotorIds = buildMappings.filter(m => m.equipmentType === 'motors').map(m => m.equipmentId);
                      const fLnbs = allLnbs.filter(l => mappedLnbIds.includes(l.id));
                      const fSwitches = allSwitches.filter(s => mappedSwitchIds.includes(s.id));
                      const fMotors = allMotors.filter(m => mappedMotorIds.includes(m.id));
                      return (
                        <>
                          <InlineFormField label="LNB">
                            <Select value={satEditData.mappedLnb || "none"} onValueChange={(v) => setSatEditData({...satEditData, mappedLnb: v === "none" ? "" : v})}>
                              <SelectTrigger><SelectValue placeholder="Select LNB" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">None</SelectItem>{fLnbs.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.bandType})</SelectItem>)}</SelectContent>
                            </Select>
                          </InlineFormField>
                          <InlineFormField label="Switch">
                            <Select value={satEditData.mappedSwitch || "none"} onValueChange={(v) => setSatEditData({...satEditData, mappedSwitch: v === "none" ? "" : v})}>
                              <SelectTrigger><SelectValue placeholder="Select Switch" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">None</SelectItem>{fSwitches.map(s => <SelectItem key={s.id} value={s.id}>{s.switchType}</SelectItem>)}</SelectContent>
                            </Select>
                          </InlineFormField>
                          <InlineFormField label="Motor">
                            <Select value={satEditData.mappedMotor || "none"} onValueChange={(v) => setSatEditData({...satEditData, mappedMotor: v === "none" ? "" : v})}>
                              <SelectTrigger><SelectValue placeholder="Select Motor" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">None</SelectItem>{fMotors.map(m => <SelectItem key={m.id} value={m.id}>{m.motorType}</SelectItem>)}</SelectContent>
                            </Select>
                          </InlineFormField>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Carriers */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Carriers ({(satEditData.carriers || []).length})</CardTitle>
                      <Button variant="outline" size="sm" onClick={addCarrierToSatEdit}><Plus className="h-3 w-3 mr-1" /> Add Carrier</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(satEditData.carriers || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No carriers. Click "Add Carrier" to create one.</p>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {(satEditData.carriers || []).map((carrier: any, cIdx: number) => (
                          <AccordionItem key={carrier.id || cIdx} value={carrier.id || `carrier-${cIdx}`} className="border rounded-lg mb-2">
                            <div className="flex items-center px-4 py-3">
                              <AccordionTrigger className="flex-1 hover:no-underline p-0 [&>svg]:ml-2">
                                <div className="flex items-center gap-3 flex-1 text-left">
                                  <span className="font-medium">{carrier.name || `Carrier ${cIdx + 1}`}</span>
                                  {carrier.frequency && <Badge variant="outline" className="text-xs">{carrier.frequency} MHz</Badge>}
                                  <Badge variant="secondary" className="text-xs">{(carrier.services || []).length} services</Badge>
                                </div>
                              </AccordionTrigger>
                              <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeCarrierFromSatEdit(cIdx)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <AccordionContent className="px-4 pb-4">
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                <InlineFormField label="Name"><Input value={carrier.name || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'name', e.target.value)} /></InlineFormField>
                                <InlineFormField label="Frequency"><Input value={carrier.frequency || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'frequency', e.target.value)} /></InlineFormField>
                                <InlineFormField label="Polarization">
                                  <Select value={carrier.polarization || "none"} onValueChange={(v) => updateCarrierInSatEdit(cIdx, 'polarization', v === "none" ? "" : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent><SelectItem value="none">Select</SelectItem>{POLARIZATIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                  </Select>
                                </InlineFormField>
                                <InlineFormField label="Symbol Rate"><Input value={carrier.symbolRate || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'symbolRate', e.target.value)} /></InlineFormField>
                                <InlineFormField label="FEC">
                                  <Select value={carrier.fec || "none"} onValueChange={(v) => updateCarrierInSatEdit(cIdx, 'fec', v === "none" ? "" : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent><SelectItem value="none">Select</SelectItem>{FEC_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                  </Select>
                                </InlineFormField>
                                <InlineFormField label="Modulation"><Input value={carrier.modulationType || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'modulationType', e.target.value)} /></InlineFormField>
                                <InlineFormField label="TSID"><Input value={carrier.tsid || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'tsid', e.target.value)} /></InlineFormField>
                                <InlineFormField label="ONID"><Input value={carrier.onid || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'onid', e.target.value)} /></InlineFormField>
                                <InlineFormField label="Network ID"><Input value={carrier.networkId || ""} onChange={(e) => updateCarrierInSatEdit(cIdx, 'networkId', e.target.value)} /></InlineFormField>
                              </div>

                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">Services ({(carrier.services || []).length})</span>
                                  <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => addServiceToCarrier(cIdx)}><Plus className="h-3 w-3 mr-1" /> Service</Button>
                                </div>
                                {(carrier.services || []).length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">No services</p>
                                ) : (
                                  <div className="rounded border overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-muted/30">
                                        <TableRow>
                                          <TableHead className="text-xs py-1">Name</TableHead>
                                          <TableHead className="text-xs py-1">Type</TableHead>
                                          <TableHead className="text-xs py-1">Video PID</TableHead>
                                          <TableHead className="text-xs py-1">Audio PID</TableHead>
                                          <TableHead className="text-xs py-1">PCR PID</TableHead>
                                          <TableHead className="text-xs py-1">Prog #</TableHead>
                                          <TableHead className="text-xs py-1">Fav Group</TableHead>
                                          <TableHead className="text-xs py-1 w-10"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(carrier.services || []).map((svc: any, sIdx: number) => (
                                          <TableRow key={svc.id || sIdx}>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.name || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'name', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.serviceType || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'serviceType', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.videoPid || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'videoPid', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.audioPid || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'audioPid', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.pcrPid || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'pcrPid', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.programNumber || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'programNumber', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Input className="text-xs h-7" value={svc.favGroup || ""} onChange={(e) => updateServiceInCarrier(cIdx, sIdx, 'favGroup', e.target.value)} /></TableCell>
                                            <TableCell className="py-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeServiceFromCarrier(cIdx, sIdx)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSatelliteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSatelliteEdit} disabled={isSavingSatellite}>
              {isSavingSatellite ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Project Report - {selectedProject?.name} / {selectedBuild?.name}
            </DialogTitle>
            <DialogDescription>Summary of all mapped equipment for this build.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[75vh]">
            <div className="space-y-6 pr-4">
              <div className="grid grid-cols-5 gap-4">
                <Card><CardContent className="p-4 text-center"><Radio className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().lnbs.length}</p><p className="text-xs text-muted-foreground">LNBs</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Zap className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().switches.length}</p><p className="text-xs text-muted-foreground">Switches</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><RotateCcw className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().motors.length}</p><p className="text-xs text-muted-foreground">Motors</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Activity className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().unicables.length}</p><p className="text-xs text-muted-foreground">Unicables</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Satellite className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().satellites.length}</p><p className="text-xs text-muted-foreground">Satellites</p></CardContent></Card>
              </div>
              {getMappedEquipment().lnbs.length > 0 && (
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4" />LNBs</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Band</TableHead><TableHead>Low Freq</TableHead><TableHead>High Freq</TableHead><TableHead>Power</TableHead><TableHead>22KHz</TableHead></TableRow></TableHeader><TableBody>{getMappedEquipment().lnbs.map(l => <TableRow key={l.id}><TableCell>{l.name}</TableCell><TableCell>{l.bandType || '-'}</TableCell><TableCell>{l.lowFrequency || '-'}</TableCell><TableCell>{l.highFrequency || '-'}</TableCell><TableCell>{l.powerControl || '-'}</TableCell><TableCell>{l.khzOption || '-'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              )}
              {getMappedEquipment().switches.length > 0 && (
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Switches</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Options</TableHead></TableRow></TableHeader><TableBody>{getMappedEquipment().switches.map(s => <TableRow key={s.id}><TableCell>{s.switchType || '-'}</TableCell><TableCell>{(Array.isArray(s.switchOptions) ? s.switchOptions : []).join(', ') || '-'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              )}
              {getMappedEquipment().motors.length > 0 && (
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" />Motors</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Position/Coords</TableHead></TableRow></TableHeader><TableBody>{getMappedEquipment().motors.map(m => <TableRow key={m.id}><TableCell>{m.motorType || '-'}</TableCell><TableCell>{m.motorType === 'DiSEqC 1.0' ? m.position || '-' : `${m.longitude || '?'}° ${m.eastWest || ''}, ${m.latitude || '?'}° ${m.northSouth || ''}`}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              )}
              {getMappedEquipment().unicables.length > 0 && (
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Unicables</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Port</TableHead><TableHead>Slots</TableHead></TableRow></TableHeader><TableBody>{getMappedEquipment().unicables.map(u => <TableRow key={u.id}><TableCell>{u.unicableType || '-'}</TableCell><TableCell>{u.status || '-'}</TableCell><TableCell>{u.port || '-'}</TableCell><TableCell>{(u.ifSlots || []).length} slots</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              )}
              {getMappedEquipment().satellites.length > 0 && (
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Satellite className="h-4 w-4" />Satellites</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Direction</TableHead><TableHead>Carriers</TableHead><TableHead>Services</TableHead></TableRow></TableHeader><TableBody>{getMappedEquipment().satellites.map(s => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.position || '-'}</TableCell><TableCell>{s.direction || '-'}</TableCell><TableCell>{(s.carriers || []).length}</TableCell><TableCell>{(s.carriers || []).reduce((sum: number, c: any) => sum + (c.services || []).length, 0)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMapping;
