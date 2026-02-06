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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FolderOpen, Radio, Zap, RotateCcw, Activity, Satellite, Loader2, FileCode, Download, Package,
  ChevronRight, Settings, FileText, Search, Edit, Save, Eye, Plus, Trash2, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { exportService } from "@/services/exportService";
import InlineFormField from "@/components/InlineFormField";

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
  
  // Selection states
  const [projects, setProjects] = useState<Project[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBuildId, setSelectedBuildId] = useState<string>('');
  
  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState<string | null>(null);
  const [isGeneratingBin, setIsGeneratingBin] = useState(false);
  const [isUpdatingEquipment, setIsUpdatingEquipment] = useState(false);
  
  // Equipment lists (global bucket)
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  
  // Build mappings
  const [buildMappings, setBuildMappings] = useState<any[]>([]);
  
  // Search states
  const [lnbSearch, setLnbSearch] = useState("");
  const [switchSearch, setSwitchSearch] = useState("");
  const [motorSearch, setMotorSearch] = useState("");
  const [unicableSearch, setUnicableSearch] = useState("");
  const [satelliteSearch, setSatelliteSearch] = useState("");
  
  // Edit states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string>("");
  const [editFormData, setEditFormData] = useState<any>({});
  
  // Satellite detail dialog
  const [selectedSatelliteDetail, setSelectedSatelliteDetail] = useState<any>(null);
  const [isSatelliteDialogOpen, setIsSatelliteDialogOpen] = useState(false);
  
  // Report dialog
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
    loadAllEquipment();
  }, []);

  // Load builds when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadBuilds(selectedProjectId);
      setSelectedBuildId('');
      setBuildMappings([]);
    }
  }, [selectedProjectId]);

  // Load mappings when build changes
  useEffect(() => {
    if (selectedBuildId) {
      loadBuildMappings(selectedBuildId);
    }
  }, [selectedBuildId]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const data = await apiService.getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
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
      console.error('Failed to load builds:', error);
      toast({ title: "Error", description: "Failed to load builds", variant: "destructive" });
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  const loadAllEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const [lnbs, switches, motors, unicables, satellites] = await Promise.all([
        apiService.getEquipment('lnbs'),
        apiService.getEquipment('switches'),
        apiService.getEquipment('motors'),
        apiService.getEquipment('unicables'),
        apiService.getSatellites()
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
      const existingMapping = buildMappings.find(
        m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
      );

      if (existingMapping) {
        await apiService.removeBuildMapping(selectedBuildId, equipmentType, equipmentId);
        setBuildMappings(prev => prev.filter(m => 
          !(m.equipmentType === equipmentType && m.equipmentId === equipmentId)
        ));
        toast({ title: "Removed", description: "Equipment removed from build." });
      } else {
        await apiService.addBuildMapping(selectedBuildId, equipmentType, equipmentId);
        setBuildMappings(prev => [...prev, { 
          buildId: selectedBuildId, 
          equipmentType, 
          equipmentId 
        }]);
        toast({ title: "Added", description: "Equipment added to build." });
      }

      await apiService.logActivity(
        username, 
        existingMapping ? "Mapping Removed" : "Mapping Added", 
        `${existingMapping ? 'Removed' : 'Added'} ${equipmentType} mapping to build`, 
        selectedProjectId
      );
    } catch (error) {
      toast({ title: "Error", description: "Failed to update mapping", variant: "destructive" });
    } finally {
      setIsSavingMapping(null);
    }
  };

  const isMapped = (equipmentType: string, equipmentId: string) => {
    return buildMappings.some(
      m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
    );
  };

  const getMappingCount = (equipmentType: string) => {
    return buildMappings.filter(m => m.equipmentType === equipmentType).length;
  };

  // Start editing
  const handleStartEdit = (item: any, type: string) => {
    setEditingItem(item);
    setEditingType(type);
    setEditFormData({ ...item });
  };

  // Save edited item
  const handleSaveEdit = async () => {
    if (!editingItem || !editingType) return;
    
    setIsUpdatingEquipment(true);
    try {
      await apiService.updateEquipment(editingType, editingItem.id, editFormData);
      toast({ title: "Updated", description: `Equipment updated successfully.` });
      setEditingItem(null);
      setEditingType("");
      loadAllEquipment();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update equipment.", variant: "destructive" });
    } finally {
      setIsUpdatingEquipment(false);
    }
  };

  // Filter functions
  const filteredLnbs = allLnbs.filter(l => 
    l.name?.toLowerCase().includes(lnbSearch.toLowerCase()) ||
    l.bandType?.toLowerCase().includes(lnbSearch.toLowerCase())
  );

  const filteredSwitches = allSwitches.filter(s =>
    s.switchType?.toLowerCase().includes(switchSearch.toLowerCase())
  );

  const filteredMotors = allMotors.filter(m =>
    m.motorType?.toLowerCase().includes(motorSearch.toLowerCase())
  );

  const filteredUnicables = allUnicables.filter(u =>
    u.unicableType?.toLowerCase().includes(unicableSearch.toLowerCase())
  );

  const filteredSatellites = allSatellites.filter(s =>
    s.name?.toLowerCase().includes(satelliteSearch.toLowerCase()) ||
    s.position?.toLowerCase().includes(satelliteSearch.toLowerCase())
  );

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
    
    // LNB Block
    mappedLnbs.forEach(l => {
      xml += `    <LNBlock>\n`;
      xml += `      <name>${l.name}</name>\n`;
      xml += `      <LowFrequency>${l.lowFrequency || ''}</LowFrequency>\n`;
      xml += `      <HighFrequency>${l.highFrequency || ''}</HighFrequency>\n`;
      xml += `      <LO1High>${l.lo1High || ''}</LO1High>\n`;
      xml += `      <LO1Low>${l.lo1Low || ''}</LO1Low>\n`;
      xml += `      <BandType>${l.bandType || ''}</BandType>\n`;
      xml += `      <PowerControl>${l.powerControl || ''}</PowerControl>\n`;
      xml += `      <VControl>${l.vControl || ''}</VControl>\n`;
      xml += `      <KhzOption>${l.khzOption || ''}</KhzOption>\n`;
      xml += `    </LNBlock>\n`;
    });
    
    // Switch Block
    mappedSwitches.forEach(s => {
      xml += `    <switchblock>\n`;
      xml += `      <type>${s.switchType || ''}</type>\n`;
      const options = Array.isArray(s.switchOptions) ? s.switchOptions : [];
      options.forEach((opt: string, idx: number) => {
        xml += `      <option${idx + 1}>${opt}</option${idx + 1}>\n`;
      });
      xml += `    </switchblock>\n`;
    });
    
    // Motor Block
    mappedMotors.forEach(m => {
      xml += `    <motor>\n`;
      xml += `      <type>${m.motorType || ''}</type>\n`;
      if (m.motorType === 'DiSEqC 1.0') {
        xml += `      <position>${m.position || ''}</position>\n`;
      } else {
        xml += `      <longitude>${m.longitude || ''}</longitude>\n`;
        xml += `      <latitude>${m.latitude || ''}</latitude>\n`;
        xml += `      <eastWest>${m.eastWest || ''}</eastWest>\n`;
        xml += `      <northSouth>${m.northSouth || ''}</northSouth>\n`;
      }
      xml += `    </motor>\n`;
    });
    
    // Unicable Block
    mappedUnicables.forEach(u => {
      xml += `    <unicable>\n`;
      xml += `      <type>${u.unicableType || ''}</type>\n`;
      xml += `      <status>${u.status || ''}</status>\n`;
      if (u.unicableType === 'DSCR') {
        xml += `      <port>${u.port || ''}</port>\n`;
      }
      const slots = Array.isArray(u.ifSlots) ? u.ifSlots : [];
      slots.forEach((slot: string, idx: number) => {
        xml += `      <slot${idx + 1}>${slot}</slot${idx + 1}>\n`;
      });
      xml += `    </unicable>\n`;
    });
    
    // Satellite Block
    if (mappedSats.length > 0) {
      xml += `    <sattliteblock>\n`;
      mappedSats.forEach(sat => {
        xml += `      <sattliteinfo>\n`;
        xml += `        <name>${sat.name}</name>\n`;
        xml += `        <position>${sat.position || ''}</position>\n`;
        xml += `        <direction>${sat.direction || ''}</direction>\n`;
        (sat.carriers || []).forEach((c: any) => {
          xml += `        <carrers>\n`;
          xml += `          <name>${c.name}</name>\n`;
          xml += `          <frequency>${c.frequency || ''}</frequency>\n`;
          xml += `          <polarization>${c.polarization || ''}</polarization>\n`;
          xml += `          <symbolRate>${c.symbolRate || ''}</symbolRate>\n`;
          xml += `          <fec>${c.fec || ''}</fec>\n`;
          (c.services || []).forEach((s: any) => {
            xml += `          <services>\n`;
            xml += `            <name>${s.name}</name>\n`;
            xml += `            <videoPid>${s.videoPid || ''}</videoPid>\n`;
            xml += `            <audioPid>${s.audioPid || ''}</audioPid>\n`;
            xml += `            <pcrPid>${s.pcrPid || ''}</pcrPid>\n`;
            xml += `            <programNumber>${s.programNumber || ''}</programNumber>\n`;
            xml += `          </services>\n`;
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
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
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
        
        toast({
          title: "XML Downloaded", 
          description: result.error || "BIN generation requires bundled executables. XML downloaded instead."
        });
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

  // Render equipment item card with full details
  const renderEquipmentCard = (item: any, type: string, icon: React.ReactNode) => {
    const mapped = isMapped(type, item.id);
    const saving = isSavingMapping === `${type}-${item.id}`;
    const isEditing = editingItem?.id === item.id && editingType === type;

    return (
      <Card 
        key={item.id} 
        className={`transition-all ${mapped ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => !saving && handleToggleMapping(type, item.id)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Checkbox checked={mapped} className="pointer-events-none" />
              )}
              {icon}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm truncate">
                  {type === 'lnbs' ? item.name : 
                   type === 'switches' ? item.switchType :
                   type === 'motors' ? item.motorType :
                   type === 'unicables' ? item.unicableType :
                   item.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {type === 'lnbs' && `${item.bandType || 'N/A'} | ${item.lowFrequency || '?'}-${item.highFrequency || '?'}`}
                  {type === 'switches' && `${(item.switchOptions || []).length} options`}
                  {type === 'motors' && (item.motorType === 'DiSEqC 1.0' ? `Pos: ${item.position || 'N/A'}` : `${item.longitude || '?'}° ${item.eastWest || ''}`)}
                  {type === 'unicables' && `${item.status || 'OFF'} | ${(item.ifSlots || []).length} slots`}
                  {type === 'satellites' && `${item.position || 'N/A'} | ${(item.carriers || []).length} carriers`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mapped && <Badge variant="default" className="text-xs mr-1">Mapped</Badge>}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (type === 'satellites') {
                    setSelectedSatelliteDetail(item);
                    setIsSatelliteDialogOpen(true);
                  } else if (isEditing) {
                    setEditingItem(null);
                    setEditingType("");
                  } else {
                    handleStartEdit(item, type);
                  }
                }}
              >
                {type === 'satellites' ? <Eye className="h-3 w-3" /> : isEditing ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isEditing && type !== 'satellites' && (
          <CardContent className="pt-0 px-4 pb-4">
            <Separator className="mb-3" />
            {type === 'lnbs' && (
              <div className="space-y-2">
                <InlineFormField label="Name"><Input value={editFormData.name || ""} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} /></InlineFormField>
                <InlineFormField label="Low Freq"><Input value={editFormData.lowFrequency || ""} onChange={(e) => setEditFormData({...editFormData, lowFrequency: e.target.value})} /></InlineFormField>
                <InlineFormField label="High Freq"><Input value={editFormData.highFrequency || ""} onChange={(e) => setEditFormData({...editFormData, highFrequency: e.target.value})} /></InlineFormField>
                <InlineFormField label="LO1(H)"><Input value={editFormData.lo1High || ""} onChange={(e) => setEditFormData({...editFormData, lo1High: e.target.value})} /></InlineFormField>
                <InlineFormField label="LO1(L)"><Input value={editFormData.lo1Low || ""} onChange={(e) => setEditFormData({...editFormData, lo1Low: e.target.value})} /></InlineFormField>
                <InlineFormField label="Band Type">
                  <Select value={editFormData.bandType || ""} onValueChange={(v) => setEditFormData({...editFormData, bandType: v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C-Band">C-Band</SelectItem>
                      <SelectItem value="Ku-Band">Ku-Band</SelectItem>
                      <SelectItem value="Ka-Band">Ka-Band</SelectItem>
                    </SelectContent>
                  </Select>
                </InlineFormField>
              </div>
            )}
            {type === 'switches' && (
              <div className="space-y-2">
                <InlineFormField label="Type">
                  <Select value={editFormData.switchType || ""} onValueChange={(v) => setEditFormData({...editFormData, switchType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tone Burst">Tone Burst</SelectItem>
                      <SelectItem value="DiSEqC 1.0">DiSEqC 1.0</SelectItem>
                      <SelectItem value="DiSEqC 1.1">DiSEqC 1.1</SelectItem>
                    </SelectContent>
                  </Select>
                </InlineFormField>
                <div>
                  <p className="text-xs font-medium mb-2">Options</p>
                  {(editFormData.switchOptions || []).map((opt: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <Input 
                        value={opt} 
                        onChange={(e) => {
                          const newOpts = [...(editFormData.switchOptions || [])];
                          newOpts[idx] = e.target.value;
                          setEditFormData({...editFormData, switchOptions: newOpts});
                        }}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditFormData({...editFormData, switchOptions: (editFormData.switchOptions || []).filter((_: any, i: number) => i !== idx)})}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditFormData({...editFormData, switchOptions: [...(editFormData.switchOptions || []), ""]})}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}
            {type === 'motors' && (
              <div className="space-y-2">
                <InlineFormField label="Type">
                  <Select value={editFormData.motorType || ""} onValueChange={(v) => setEditFormData({...editFormData, motorType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DiSEqC 1.0">DiSEqC 1.0</SelectItem>
                      <SelectItem value="DiSEqC 1.2">DiSEqC 1.2</SelectItem>
                    </SelectContent>
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
                      <Select value={editFormData.eastWest || ""} onValueChange={(v) => setEditFormData({...editFormData, eastWest: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="East">East</SelectItem><SelectItem value="West">West</SelectItem></SelectContent>
                      </Select>
                    </InlineFormField>
                    <InlineFormField label="N/S">
                      <Select value={editFormData.northSouth || ""} onValueChange={(v) => setEditFormData({...editFormData, northSouth: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="North">North</SelectItem><SelectItem value="South">South</SelectItem></SelectContent>
                      </Select>
                    </InlineFormField>
                  </>
                )}
              </div>
            )}
            {type === 'unicables' && (
              <div className="space-y-2">
                <InlineFormField label="Type">
                  <Select value={editFormData.unicableType || ""} onValueChange={(v) => setEditFormData({...editFormData, unicableType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="DSCR">DSCR</SelectItem><SelectItem value="DCSS">DCSS</SelectItem></SelectContent>
                  </Select>
                </InlineFormField>
                <InlineFormField label="Status">
                  <Select value={editFormData.status || "OFF"} onValueChange={(v) => setEditFormData({...editFormData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ON">ON</SelectItem><SelectItem value="OFF">OFF</SelectItem></SelectContent>
                  </Select>
                </InlineFormField>
                {editFormData.unicableType === "DSCR" && (
                  <InlineFormField label="Port">
                    <Select value={editFormData.port || "None"} onValueChange={(v) => setEditFormData({...editFormData, port: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="None">None</SelectItem><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem></SelectContent>
                    </Select>
                  </InlineFormField>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setEditingType(""); }}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isUpdatingEquipment}>
                {isUpdatingEquipment ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedBuild = builds.find(b => b.id === selectedBuildId);

  // Get mapped equipment for report
  const getMappedEquipment = () => ({
    lnbs: allLnbs.filter(l => isMapped('lnbs', l.id)),
    switches: allSwitches.filter(s => isMapped('switches', s.id)),
    motors: allMotors.filter(m => isMapped('motors', m.id)),
    unicables: allUnicables.filter(u => isMapped('unicables', u.id)),
    satellites: allSatellites.filter(s => isMapped('satellites', s.id))
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            Project Mapping
          </h2>
          <p className="text-muted-foreground mt-1">
            Select project and build, then map equipment from the global bucket
          </p>
        </div>
      </div>

      {/* Selection Flow */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Selection
          </CardTitle>
          <CardDescription>
            Choose a project and build to view and manage equipment mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Project Select */}
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Project">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoadingProjects ? "Loading..." : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />

            {/* Build Select */}
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Build">
                <Select 
                  value={selectedBuildId} 
                  onValueChange={setSelectedBuildId}
                  disabled={!selectedProjectId || isLoadingBuilds}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      !selectedProjectId ? "Select project first" : 
                      isLoadingBuilds ? "Loading builds..." : 
                      builds.length === 0 ? "No builds available" :
                      "Select a build"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {builds.map((build) => (
                      <SelectItem key={build.id} value={build.id}>
                        {build.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFormField>
            </div>

            {/* Actions */}
            {selectedBuildId && (
              <div className="flex gap-2 items-end">
                <Button variant="outline" size="sm" onClick={() => setIsReportDialogOpen(true)}>
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Report
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="mr-1 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <Download className="mr-1 h-4 w-4" />
                  Excel
                </Button>
                <Button size="sm" onClick={handleGenerateBin} disabled={isGeneratingBin}>
                  {isGeneratingBin ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileCode className="mr-1 h-4 w-4" />}
                  Generate BIN
                </Button>
              </div>
            )}
          </div>

          {/* Selection Info */}
          {selectedProject && selectedBuild && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedProject.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span>{selectedBuild.name}</span>
                <Badge variant="secondary" className="ml-auto">
                  {buildMappings.length} equipment mapped
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Mapping */}
      {selectedBuildId ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">SDB Information - Equipment Mapping</CardTitle>
            <CardDescription>
              Select equipment to include in this build configuration. Click edit to modify details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMappings || isLoadingEquipment ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading equipment...</span>
              </div>
            ) : (
              <Tabs defaultValue="lnbs" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="lnbs" className="flex items-center gap-1">
                    <Radio className="h-4 w-4" />
                    <span className="hidden sm:inline">LNBs</span>
                    <Badge variant="outline" className="ml-1 text-xs">{getMappingCount('lnbs')}/{allLnbs.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="switches" className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">Switches</span>
                    <Badge variant="outline" className="ml-1 text-xs">{getMappingCount('switches')}/{allSwitches.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="motors" className="flex items-center gap-1">
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Motors</span>
                    <Badge variant="outline" className="ml-1 text-xs">{getMappingCount('motors')}/{allMotors.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unicables" className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Unicables</span>
                    <Badge variant="outline" className="ml-1 text-xs">{getMappingCount('unicables')}/{allUnicables.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="satellites" className="flex items-center gap-1">
                    <Satellite className="h-4 w-4" />
                    <span className="hidden sm:inline">Satellites</span>
                    <Badge variant="outline" className="ml-1 text-xs">{getMappingCount('satellites')}/{allSatellites.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* LNBs Tab */}
                <TabsContent value="lnbs">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search LNBs..." value={lnbSearch} onChange={(e) => setLnbSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-3">
                      {filteredLnbs.map(item => renderEquipmentCard(item, 'lnbs', <Radio className="h-4 w-4 text-primary" />))}
                      {filteredLnbs.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No LNBs found</p>}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Switches Tab */}
                <TabsContent value="switches">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Switches..." value={switchSearch} onChange={(e) => setSwitchSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-3">
                      {filteredSwitches.map(item => renderEquipmentCard(item, 'switches', <Zap className="h-4 w-4 text-primary" />))}
                      {filteredSwitches.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No switches found</p>}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Motors Tab */}
                <TabsContent value="motors">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Motors..." value={motorSearch} onChange={(e) => setMotorSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-3">
                      {filteredMotors.map(item => renderEquipmentCard(item, 'motors', <RotateCcw className="h-4 w-4 text-primary" />))}
                      {filteredMotors.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No motors found</p>}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Unicables Tab */}
                <TabsContent value="unicables">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Unicables..." value={unicableSearch} onChange={(e) => setUnicableSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-3">
                      {filteredUnicables.map(item => renderEquipmentCard(item, 'unicables', <Activity className="h-4 w-4 text-primary" />))}
                      {filteredUnicables.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No unicables found</p>}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Satellites Tab */}
                <TabsContent value="satellites">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Satellites..." value={satelliteSearch} onChange={(e) => setSatelliteSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-3">
                      {filteredSatellites.map(item => renderEquipmentCard(item, 'satellites', <Satellite className="h-4 w-4 text-primary" />))}
                      {filteredSatellites.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No satellites found</p>}
                    </div>
                  </ScrollArea>
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
            <p className="text-center max-w-md">
              Select a project and build above to view and manage equipment mappings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Satellite Detail Dialog */}
      <Dialog open={isSatelliteDialogOpen} onOpenChange={setIsSatelliteDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              {selectedSatelliteDetail?.name} - Full Details
            </DialogTitle>
          </DialogHeader>
          {selectedSatelliteDetail && (
            <ScrollArea className="h-[65vh]">
              <div className="space-y-4 pr-4">
                {/* Basic Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div><span className="text-sm text-muted-foreground">Position:</span><p className="font-medium">{selectedSatelliteDetail.position || 'N/A'}</p></div>
                  <div><span className="text-sm text-muted-foreground">Direction:</span><p className="font-medium">{selectedSatelliteDetail.direction || 'N/A'}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status:</span><p className="font-medium">{selectedSatelliteDetail.age || 'N/A'}</p></div>
                </div>

                {/* Equipment Mappings */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Mapped Equipment</h4>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div><Radio className="h-4 w-4 text-primary inline mr-1" />LNB: {allLnbs.find(l => l.id === selectedSatelliteDetail.mappedLnb)?.name || 'None'}</div>
                    <div><Zap className="h-4 w-4 text-primary inline mr-1" />Switch: {selectedSatelliteDetail.mappedSwitch ? selectedSatelliteDetail.mappedSwitch.split(',').map((id: string) => allSwitches.find(s => s.id === id)?.switchType).filter(Boolean).join(', ') : 'None'}</div>
                    <div><RotateCcw className="h-4 w-4 text-primary inline mr-1" />Motor: {allMotors.find(m => m.id === selectedSatelliteDetail.mappedMotor)?.motorType || 'None'}</div>
                    <div><Activity className="h-4 w-4 text-primary inline mr-1" />Unicable: {allUnicables.find(u => u.id === selectedSatelliteDetail.mappedUnicable)?.unicableType || 'None'}</div>
                  </div>
                </div>

                {/* Carriers */}
                <div>
                  <h4 className="font-medium mb-2">Carriers ({(selectedSatelliteDetail.carriers || []).length})</h4>
                  {(selectedSatelliteDetail.carriers || []).map((carrier: any, idx: number) => (
                    <Card key={carrier.id || idx} className="mb-3">
                      <CardHeader className="py-2 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{carrier.name}</CardTitle>
                          <Badge variant="secondary">{(carrier.services || []).length} services</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground mb-2">
                          <span>Freq: {carrier.frequency || '-'}</span>
                          <span>Pol: {carrier.polarization || '-'}</span>
                          <span>SR: {carrier.symbolRate || '-'}</span>
                          <span>FEC: {carrier.fec || '-'}</span>
                          <span>Mode: {carrier.fecMode || '-'}</span>
                        </div>
                        {(carrier.services || []).length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs">
                                <TableHead className="py-1">Service</TableHead>
                                <TableHead className="py-1">Video PID</TableHead>
                                <TableHead className="py-1">Audio PID</TableHead>
                                <TableHead className="py-1">PCR PID</TableHead>
                                <TableHead className="py-1">Prog #</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(carrier.services || []).map((service: any, sIdx: number) => (
                                <TableRow key={service.id || sIdx} className="text-xs">
                                  <TableCell className="py-1">{service.name}</TableCell>
                                  <TableCell className="py-1">{service.videoPid || '-'}</TableCell>
                                  <TableCell className="py-1">{service.audioPid || '-'}</TableCell>
                                  <TableCell className="py-1">{service.pcrPid || '-'}</TableCell>
                                  <TableCell className="py-1">{service.programNumber || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(selectedSatelliteDetail.carriers || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No carriers configured</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
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
          </DialogHeader>
          <ScrollArea className="h-[75vh]">
            <div className="space-y-6 pr-4">
              {/* Summary */}
              <div className="grid grid-cols-5 gap-4">
                <Card><CardContent className="p-4 text-center"><Radio className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().lnbs.length}</p><p className="text-xs text-muted-foreground">LNBs</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Zap className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().switches.length}</p><p className="text-xs text-muted-foreground">Switches</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><RotateCcw className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().motors.length}</p><p className="text-xs text-muted-foreground">Motors</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Activity className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().unicables.length}</p><p className="text-xs text-muted-foreground">Unicables</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Satellite className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{getMappedEquipment().satellites.length}</p><p className="text-xs text-muted-foreground">Satellites</p></CardContent></Card>
              </div>

              {/* LNBs */}
              {getMappedEquipment().lnbs.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4" />LNBs</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Band</TableHead><TableHead>Low Freq</TableHead><TableHead>High Freq</TableHead><TableHead>LO1(H)</TableHead><TableHead>LO1(L)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {getMappedEquipment().lnbs.map(l => (
                          <TableRow key={l.id}><TableCell>{l.name}</TableCell><TableCell>{l.bandType || '-'}</TableCell><TableCell>{l.lowFrequency || '-'}</TableCell><TableCell>{l.highFrequency || '-'}</TableCell><TableCell>{l.lo1High || '-'}</TableCell><TableCell>{l.lo1Low || '-'}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Switches */}
              {getMappedEquipment().switches.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Switches</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Options</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {getMappedEquipment().switches.map(s => (
                          <TableRow key={s.id}><TableCell>{s.switchType || '-'}</TableCell><TableCell>{(s.switchOptions || []).join(', ') || '-'}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Motors */}
              {getMappedEquipment().motors.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" />Motors</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Position/Coords</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {getMappedEquipment().motors.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{m.motorType || '-'}</TableCell>
                            <TableCell>{m.motorType === 'DiSEqC 1.0' ? m.position || '-' : `${m.longitude || '?'}° ${m.eastWest || ''}, ${m.latitude || '?'}° ${m.northSouth || ''}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Unicables */}
              {getMappedEquipment().unicables.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Unicables</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Port</TableHead><TableHead>Slots</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {getMappedEquipment().unicables.map(u => (
                          <TableRow key={u.id}><TableCell>{u.unicableType || '-'}</TableCell><TableCell>{u.status || '-'}</TableCell><TableCell>{u.port || '-'}</TableCell><TableCell>{(u.ifSlots || []).length} slots</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Satellites */}
              {getMappedEquipment().satellites.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Satellite className="h-4 w-4" />Satellites</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Direction</TableHead><TableHead>Carriers</TableHead><TableHead>Services</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {getMappedEquipment().satellites.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.position || '-'}</TableCell>
                            <TableCell>{s.direction || '-'}</TableCell>
                            <TableCell>{(s.carriers || []).length}</TableCell>
                            <TableCell>{(s.carriers || []).reduce((sum: number, c: any) => sum + (c.services || []).length, 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMapping;
