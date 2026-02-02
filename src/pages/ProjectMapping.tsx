import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, FolderOpen, Edit, Trash2, Download, Radio, Zap, RotateCcw, Activity, Satellite, Check, Loader2, FileCode, FileSpreadsheet, FileText 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { exportService } from "@/services/exportService";
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

interface ProjectMappingProps {
  username: string;
}

const ProjectMapping = ({ username }: ProjectMappingProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBinDialogOpen, setIsBinDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [formData, setFormData] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBin, setIsGeneratingBin] = useState(false);
  const [savingMappingId, setSavingMappingId] = useState<string | null>(null);
  
  // Equipment lists
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  
  // Project mappings
  const [projectMappings, setProjectMappings] = useState<any[]>([]);
  
  // Import source
  const [importSourceProject, setImportSourceProject] = useState<string>('');

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
    loadEquipment();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectMappings(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const allProjects = await apiService.getProjects();
      setProjects(allProjects);
      if (allProjects.length > 0 && !selectedProject) {
        setSelectedProject(allProjects[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const [lnbs, switches, motors, unicables, satellites] = await Promise.all([
        apiService.getEquipment('lnbs'),
        apiService.getEquipment('switches'),
        apiService.getEquipment('motors'),
        apiService.getEquipment('unicables'),
        apiService.getSatellites()
      ]);
      setAllLnbs(lnbs);
      setAllSwitches(switches);
      setAllMotors(motors);
      setAllUnicables(unicables);
      setAllSatellites(satellites);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const loadProjectMappings = async (projectId: string) => {
    setIsLoadingMappings(true);
    try {
      const mappings = await apiService.getProjectMappings(projectId);
      setProjectMappings(mappings);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || '' });
    setIsDialogOpen(true);
  };

  const validateForm = async (): Promise<boolean> => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      nameRef.current?.focus();
      return false;
    }

    // Check for duplicate name
    const isDuplicate = await apiService.checkProjectDuplicate(
      formData.name, 
      editingProject?.id
    );
    if (isDuplicate) {
      toast({
        title: "Duplicate Name",
        description: "A project with this name already exists.",
        variant: "destructive",
      });
      nameRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSaveProject = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setIsSaving(true);
    try {
      if (editingProject) {
        await apiService.updateProject(editingProject.id, formData);
        await apiService.logActivity(username, "Project Updated", `Updated project: ${formData.name}`, editingProject.id);
        toast({ title: "Project Updated", description: "The project has been updated." });
      } else {
        await apiService.saveProject({ ...formData, createdBy: username });
        await apiService.logActivity(username, "Project Created", `Created project: ${formData.name}`, 'global');
        toast({ title: "Project Created", description: "The new project has been created." });
      }

      loadProjects();
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    setIsLoading(true);
    try {
      await apiService.deleteProject(selectedProject.id);
      await apiService.logActivity(username, "Project Deleted", `Deleted project: ${selectedProject.name}`, 'global');
      
      setSelectedProject(null);
      loadProjects();
      setIsDeleteDialogOpen(false);
      toast({ title: "Project Deleted", description: "The project has been deleted." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMapping = async (equipmentType: string, equipmentId: string) => {
    if (!selectedProject) return;

    setSavingMappingId(`${equipmentType}-${equipmentId}`);
    try {
      const existingMapping = projectMappings.find(
        m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
      );

      if (existingMapping) {
        await apiService.removeProjectMapping(selectedProject.id, equipmentType, equipmentId);
        toast({ title: "Mapping Removed", description: "Equipment removed from project." });
      } else {
        await apiService.addProjectMapping(selectedProject.id, equipmentType, equipmentId);
        toast({ title: "Mapping Added", description: "Equipment added to project." });
      }

      await apiService.logActivity(
        username, 
        existingMapping ? "Mapping Removed" : "Mapping Added", 
        `${existingMapping ? 'Removed' : 'Added'} ${equipmentType} mapping`, 
        selectedProject.id
      );

      loadProjectMappings(selectedProject.id);
    } finally {
      setSavingMappingId(null);
    }
  };

  const handleImportMappings = async () => {
    if (!selectedProject || !importSourceProject) {
      toast({
        title: "Validation Error",
        description: "Please select a source project.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get source project mappings and copy them
      const sourceMappings = await apiService.getProjectMappings(importSourceProject);
      for (const mapping of sourceMappings) {
        await apiService.addProjectMapping(selectedProject.id, mapping.equipmentType, mapping.equipmentId);
      }
      await apiService.logActivity(username, "Mappings Imported", `Imported mappings from another project`, selectedProject.id);
      
      loadProjectMappings(selectedProject.id);
      setIsImportDialogOpen(false);
      toast({ title: "Import Complete", description: "Mappings have been imported." });
    } finally {
      setIsSaving(false);
    }
  };

  const generateProjectXML = (): string => {
    if (!selectedProject) return "";
    
    const mappedLnbs = allLnbs.filter(l => isMapped('lnbs', l.id));
    const mappedSwitches = allSwitches.filter(s => isMapped('switches', s.id));
    const mappedMotors = allMotors.filter(m => isMapped('motors', m.id));
    const mappedUnicables = allUnicables.filter(u => isMapped('unicables', u.id));
    const mappedSats = allSatellites.filter(s => isMapped('satellites', s.id));

    // Build XML in the specified format
    let xml = `<SDB>\n`;
    xml += `<projinfo>\n`;
    xml += `<projname>${selectedProject.name}</projname>\n`;
    
    // LNB Block
    if (mappedLnbs.length > 0) {
      xml += `<LNBlock>\n`;
      mappedLnbs.forEach(l => {
        xml += `<LNBType>${l.lnbType || l.type || 'Universal'}</LNBType>\n`;
        xml += `<LowFrequency>${l.lowFrequency || ''}</LowFrequency>\n`;
        xml += `<HighFrequency>${l.highFrequency || ''}</HighFrequency>\n`;
        xml += `<BandType>${l.bandType || ''}</BandType>\n`;
        xml += `<PowerControl>${l.powerControl || ''}</PowerControl>\n`;
      });
      xml += `</LNBlock>\n`;
    }
    
    // Switch Block
    if (mappedSwitches.length > 0) {
      const switchType = mappedSwitches[0]?.switchType || 'Dis1';
      xml += `<switchblock type='${switchType}' noofSwi='${mappedSwitches.length}'>\n`;
      mappedSwitches.forEach(s => {
        xml += `<switch>${s.switchConfiguration || ''}</switch>\n`;
      });
      xml += `</switchblock>\n`;
    }
    
    // Motor Block
    xml += `<motor>\n`;
    mappedMotors.forEach(m => {
      xml += `<name>${m.name}</name>\n`;
      xml += `<type>${m.type || ''}</type>\n`;
      xml += `<position>${m.position || ''}</position>\n`;
      xml += `<longitude>${m.longitude || ''}</longitude>\n`;
      xml += `<latitude>${m.latitude || ''}</latitude>\n`;
      xml += `<status>${m.status || ''}</status>\n`;
    });
    xml += `</motor>\n`;
    
    // Unicable Block
    xml += `<unicable>\n`;
    mappedUnicables.forEach(u => {
      xml += `<name>${u.name}</name>\n`;
      xml += `<type>${u.type || ''}</type>\n`;
      xml += `<port>${u.port || ''}</port>\n`;
      xml += `<status>${u.status || ''}</status>\n`;
    });
    xml += `</unicable>\n`;
    
    // Satellite Block
    xml += `<sattliteblock>\n`;
    mappedSats.forEach(sat => {
      xml += `<sattliteinfo>\n`;
      xml += `<name>${sat.name}</name>\n`;
      xml += `<position>${sat.position || ''}</position>\n`;
      xml += `<direction>${sat.direction || ''}</direction>\n`;
      (sat.carriers || []).forEach((c: any) => {
        xml += `<carrers>\n`;
        xml += `<name>${c.name}</name>\n`;
        xml += `<frequency>${c.frequency || ''}</frequency>\n`;
        xml += `<polarization>${c.polarization || ''}</polarization>\n`;
        xml += `<symbolRate>${c.symbolRate || ''}</symbolRate>\n`;
        xml += `<fec>${c.fec || ''}</fec>\n`;
        (c.services || []).forEach((s: any) => {
          xml += `<services>\n`;
          xml += `<name>${s.name}</name>\n`;
          xml += `<frequency>${s.frequency || ''}</frequency>\n`;
          xml += `<videoPid>${s.videoPid || ''}</videoPid>\n`;
          xml += `<pcrPid>${s.pcrPid || ''}</pcrPid>\n`;
          xml += `<programNumber>${s.programNumber || ''}</programNumber>\n`;
          xml += `</services>\n`;
        });
        xml += `</carrers>\n`;
      });
      xml += `</sattliteinfo>\n`;
    });
    xml += `</sattliteblock>\n`;
    
    xml += `</projinfo>\n`;
    xml += `</SDB>`;
    
    return xml;
  };

  const handleGenerateBin = async () => {
    if (!selectedProject) return;
    
    setIsGeneratingBin(true);
    try {
      const xmlData = generateProjectXML();
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
        a.download = `${selectedProject.name.replace(/\s+/g, '_')}.bin`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "Bin Generated", description: "Bin file downloaded successfully." });
      } else {
        // Download XML as fallback
        const blob = new Blob([xmlData], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedProject.name.replace(/\s+/g, '_')}_config.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "XML Downloaded", 
          description: result.error || "Bin generation requires backend server. XML downloaded instead."
        });
      }
    } finally {
      setIsGeneratingBin(false);
      setIsBinDialogOpen(false);
    }
  };

  const handleExportPDF = () => {
    if (!selectedProject) return;
    
    exportService.exportToPDF(
      { ...selectedProject, lnbs: [], switches: [], motors: [], unicables: [], satellites: [] },
      projectMappings,
      { lnbs: allLnbs, switches: allSwitches, motors: allMotors, unicables: allUnicables, satellites: allSatellites }
    );
    setIsExportDialogOpen(false);
    toast({ title: "Export Complete", description: "PDF export opened in new window for printing." });
  };

  const handleExportExcel = () => {
    if (!selectedProject) return;
    
    exportService.exportToExcel(
      { ...selectedProject, lnbs: [], switches: [], motors: [], unicables: [], satellites: [] },
      projectMappings,
      { lnbs: allLnbs, switches: allSwitches, motors: allMotors, unicables: allUnicables, satellites: allSatellites }
    );
    setIsExportDialogOpen(false);
    toast({ title: "Export Complete", description: "Excel file downloaded." });
  };

  const isMapped = (equipmentType: string, equipmentId: string) => {
    return projectMappings.some(
      m => m.equipmentType === equipmentType && m.equipmentId === equipmentId
    );
  };

  const getMappingCount = (equipmentType: string) => {
    return projectMappings.filter(m => m.equipmentType === equipmentType).length;
  };

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
            Create projects and map equipment from the global bucket
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProject && (
            <>
              <Button 
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsBinDialogOpen(true)}
                disabled={isGeneratingBin}
              >
                {isGeneratingBin ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileCode className="mr-2 h-4 w-4" />
                )}
                Generate Bin
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Import from Project
              </Button>
            </>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddProject} className="bg-primary hover:bg-primary-hover">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  {editingProject ? "Edit Project" : "Create New Project"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    ref={nameRef}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., UK Satellite Configuration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProject} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <>{editingProject ? "Update" : "Create"} Project</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-3 text-lg text-muted-foreground">Loading projects...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Projects
                <Badge variant="secondary">{projects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {projects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No projects found</p>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-4 border-b cursor-pointer transition-colors ${
                        selectedProject?.id === project.id 
                          ? 'bg-primary/10 border-l-4 border-l-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{project.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">By {project.createdBy || project.created_by}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedProject(project);
                              setIsDeleteDialogOpen(true); 
                            }}
                          >
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

          {/* Equipment Mapping */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              {!selectedProject ? (
                <div className="text-center py-20 text-muted-foreground">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Select a project to manage equipment mappings</p>
                </div>
              ) : isLoadingEquipment || isLoadingMappings ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading equipment...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedProject.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {equipmentTypes.map(({ key, label }) => (
                        <Badge key={key} variant="secondary">
                          {label}: {getMappingCount(key)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Tabs defaultValue="lnbs">
                    <TabsList className="mb-4">
                      {equipmentTypes.map(({ key, label, icon: Icon }) => (
                        <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                          <Icon className="h-4 w-4" />
                          {label} ({getMappingCount(key)})
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {equipmentTypes.map(({ key, label, items }) => (
                      <TabsContent key={key} value={key}>
                        <Card>
                          <CardHeader className="py-3 bg-primary/5">
                            <CardTitle className="text-sm">
                              Select {label} to map to this project (click checkbox to toggle)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {items.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                No {label.toLowerCase()} available in the global bucket
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {items.map((item) => {
                                  const mapped = isMapped(key, item.id);
                                  const isSavingThis = savingMappingId === `${key}-${item.id}`;
                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => !isSavingThis && handleToggleMapping(key, item.id)}
                                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        mapped 
                                          ? 'border-primary bg-primary/5' 
                                          : 'border-muted hover:border-primary/30'
                                      } ${isSavingThis ? 'opacity-70 pointer-events-none' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="shrink-0">
                                          {isSavingThis ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                          ) : (
                                            <Checkbox 
                                              checked={mapped}
                                              className="h-5 w-5"
                                              onClick={(e) => e.stopPropagation()}
                                              onCheckedChange={() => handleToggleMapping(key, item.id)}
                                            />
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h5 className="font-medium truncate">{item.name}</h5>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {item.type || item.position || item.lnbType || item.switchType || ''}
                                          </p>
                                        </div>
                                        {mapped && !isSavingThis && (
                                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <Check className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Import Mappings
            </DialogTitle>
            <DialogDescription>
              Import equipment mappings from another project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Project</Label>
              <Select value={importSourceProject} onValueChange={setImportSourceProject}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.id !== selectedProject?.id).map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportMappings} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : "Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Project Data
            </DialogTitle>
            <DialogDescription>
              Choose export format for project "{selectedProject?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-16 justify-start gap-4"
              onClick={handleExportPDF}
            >
              <FileText className="h-8 w-8 text-red-500" />
              <div className="text-left">
                <p className="font-medium">Export as PDF</p>
                <p className="text-sm text-muted-foreground">Opens print dialog for PDF save</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-16 justify-start gap-4"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="h-8 w-8 text-green-500" />
              <div className="text-left">
                <p className="font-medium">Export as Excel (CSV)</p>
                <p className="text-sm text-muted-foreground">Downloads spreadsheet file</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bin Generation Dialog */}
      <Dialog open={isBinDialogOpen} onOpenChange={setIsBinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              Generate Bin File
            </DialogTitle>
            <DialogDescription>
              Generate a bin file from this project's configuration
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              This will generate an XML configuration file containing all mapped equipment and satellites for project "{selectedProject?.name}".
            </p>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>LNBs:</strong> {getMappingCount('lnbs')}</p>
              <p><strong>Switches:</strong> {getMappingCount('switches')}</p>
              <p><strong>Motors:</strong> {getMappingCount('motors')}</p>
              <p><strong>Unicables:</strong> {getMappingCount('unicables')}</p>
              <p><strong>Satellites:</strong> {getMappingCount('satellites')}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateBin} disabled={isGeneratingBin}>
              {isGeneratingBin ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate & Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project "{selectedProject?.name}"? All mappings will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectMapping;
