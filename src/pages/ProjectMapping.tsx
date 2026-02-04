import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FolderOpen, Radio, Zap, RotateCcw, Activity, Satellite, Loader2, FileCode, Download, Package,
  ChevronRight, Settings, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { exportService } from "@/services/exportService";

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
  
  // Equipment lists (global bucket)
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  
  // Build mappings
  const [buildMappings, setBuildMappings] = useState<any[]>([]);

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
      xml += `      <LNBType>${l.lnbType || l.type || 'Universal'}</LNBType>\n`;
      xml += `      <LowFrequency>${l.lowFrequency || ''}</LowFrequency>\n`;
      xml += `      <HighFrequency>${l.highFrequency || ''}</HighFrequency>\n`;
      xml += `      <BandType>${l.bandType || ''}</BandType>\n`;
      xml += `      <PowerControl>${l.powerControl || ''}</PowerControl>\n`;
      xml += `    </LNBlock>\n`;
    });
    
    // Switch Block
    if (mappedSwitches.length > 0) {
      const switchType = mappedSwitches[0]?.switchType || mappedSwitches[0]?.type || 'Dis1';
      xml += `    <switchblock type='${switchType}' noofSwi='${mappedSwitches.length}'>\n`;
      mappedSwitches.forEach(s => {
        xml += `      <switch>\n`;
        xml += `        <name>${s.name}</name>\n`;
        xml += `        <configuration>${s.switchConfiguration || s.configuration || ''}</configuration>\n`;
        xml += `      </switch>\n`;
      });
      xml += `    </switchblock>\n`;
    }
    
    // Motor Block
    mappedMotors.forEach(m => {
      xml += `    <motor>\n`;
      xml += `      <name>${m.name}</name>\n`;
      xml += `      <type>${m.type || ''}</type>\n`;
      xml += `      <position>${m.position || ''}</position>\n`;
      xml += `      <longitude>${m.longitude || ''}</longitude>\n`;
      xml += `      <latitude>${m.latitude || ''}</latitude>\n`;
      xml += `      <status>${m.status || ''}</status>\n`;
      xml += `    </motor>\n`;
    });
    
    // Unicable Block
    mappedUnicables.forEach(u => {
      xml += `    <unicable>\n`;
      xml += `      <name>${u.name}</name>\n`;
      xml += `      <type>${u.type || ''}</type>\n`;
      xml += `      <port>${u.port || ''}</port>\n`;
      xml += `      <status>${u.status || ''}</status>\n`;
      xml += `    </unicable>\n`;
    });
    
    // Satellite Block
    if (mappedSats.length > 0) {
      xml += `    <sattliteblock>\n`;
      mappedSats.forEach(sat => {
        xml += `      <sattliteinfo>\n`;
        xml += `        <name>${sat.name}</name>\n`;
        xml += `        <position>${sat.position || sat.orbitalPosition || ''}</position>\n`;
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
            xml += `            <serviceType>${s.serviceType || ''}</serviceType>\n`;
            xml += `            <videoPid>${s.videoPid || ''}</videoPid>\n`;
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
      
      // Save XML to build
      await apiService.updateProjectBuild(selectedBuildId, { xmlData });
      
      const result = await apiService.generateBin(xmlData);
      
      if (result.success && result.data) {
        // Convert base64 to blob and download
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
        // Download XML as fallback
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
    
    const mappedEquipment = {
      lnbs: allLnbs.filter(l => isMapped('lnbs', l.id)),
      switches: allSwitches.filter(s => isMapped('switches', s.id)),
      motors: allMotors.filter(m => isMapped('motors', m.id)),
      unicables: allUnicables.filter(u => isMapped('unicables', u.id)),
      satellites: allSatellites.filter(s => isMapped('satellites', s.id))
    };
    
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

  const equipmentTypes = [
    { key: 'lnbs', label: 'LNBs', icon: Radio, items: allLnbs },
    { key: 'switches', label: 'Switches', icon: Zap, items: allSwitches },
    { key: 'motors', label: 'Motors', icon: RotateCcw, items: allMotors },
    { key: 'unicables', label: 'Unicables', icon: Activity, items: allUnicables },
    { key: 'satellites', label: 'Satellites', icon: Satellite, items: allSatellites },
  ];

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
              <label className="text-sm font-medium mb-2 block">Project</label>
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
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />

            {/* Build Select */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Build</label>
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
            </div>

            {/* Actions */}
            {selectedBuildId && (
              <div className="flex gap-2 items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportExcel}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Excel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleGenerateBin}
                  disabled={isGeneratingBin}
                >
                  {isGeneratingBin ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <FileCode className="mr-1 h-4 w-4" />
                  )}
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
              Select equipment to include in this build configuration
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
                  {equipmentTypes.map(({ key, label, icon: Icon }) => (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {getMappingCount(key)}/{key === 'satellites' ? allSatellites.length : 
                          key === 'lnbs' ? allLnbs.length :
                          key === 'switches' ? allSwitches.length :
                          key === 'motors' ? allMotors.length : allUnicables.length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {equipmentTypes.map(({ key, label, icon: Icon, items }) => (
                  <TabsContent key={key} value={key}>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Icon className="h-12 w-12 mb-2 opacity-50" />
                          <p>No {label.toLowerCase()} available</p>
                          <p className="text-sm">Add equipment in the {label} management page</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((item) => {
                            const mapped = isMapped(key, item.id);
                            const saving = isSavingMapping === `${key}-${item.id}`;
                            
                            return (
                              <div 
                                key={item.id} 
                                className={`
                                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                                  transition-all duration-200
                                  ${mapped ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}
                                  ${saving ? 'opacity-50' : ''}
                                `}
                                onClick={() => !saving && handleToggleMapping(key, item.id)}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Checkbox 
                                    checked={mapped}
                                    className="pointer-events-none"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.type || item.lnbType || item.switchType || item.orbitalPosition || 'N/A'}
                                  </p>
                                </div>
                                {mapped && (
                                  <Badge variant="default" className="text-xs">Mapped</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
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
              Each build can have its own set of mapped equipment for generating SDB files.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectMapping;
