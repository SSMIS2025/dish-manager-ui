import { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Loader2, 
  FolderOpen,
  Settings,
  Satellite
} from "lucide-react";
import { toast } from "sonner";
import { PaginationCustom } from "@/components/ui/pagination-custom";

interface Project {
  id: string;
  name: string;
  description: string;
}

interface Build {
  id: string;
  projectId: string;
  name: string;
  description: string;
  xmlData?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ProjectBuilds = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [editingBuild, setEditingBuild] = useState<Build | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);
  
  // Form states
  const [buildName, setBuildName] = useState("");
  const [buildDescription, setBuildDescription] = useState("");
  
  // Equipment for mapping
  const [lnbs, setLnbs] = useState<any[]>([]);
  const [switches, setSwitches] = useState<any[]>([]);
  const [motors, setMotors] = useState<any[]>([]);
  const [unicables, setUnicables] = useState<any[]>([]);
  const [satellites, setSatellites] = useState<any[]>([]);
  const [buildMappings, setBuildMappings] = useState<any[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadBuilds();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await apiService.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuilds = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const data = await apiService.getProjectBuilds(selectedProject);
      setBuilds(data);
    } catch (error) {
      console.error('Failed to load builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      const [lnbData, switchData, motorData, unicableData, satelliteData] = await Promise.all([
        apiService.getEquipment('lnbs'),
        apiService.getEquipment('switches'),
        apiService.getEquipment('motors'),
        apiService.getEquipment('unicables'),
        apiService.getSatellites()
      ]);
      setLnbs(lnbData);
      setSwitches(switchData);
      setMotors(motorData);
      setUnicables(unicableData);
      setSatellites(satelliteData);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  };

  const loadBuildMappings = async (buildId: string) => {
    try {
      const mappings = await apiService.getBuildMappings(buildId);
      setBuildMappings(mappings);
    } catch (error) {
      console.error('Failed to load build mappings:', error);
    }
  };

  const handleCreateBuild = async () => {
    if (!buildName.trim()) {
      toast.error("Build name is required");
      return;
    }

    setLoading(true);
    try {
      const build = await apiService.createProjectBuild({
        projectId: selectedProject,
        name: buildName,
        description: buildDescription,
        createdBy: sessionStorage.getItem('sdb_username') || 'admin'
      });

      if (build) {
        toast.success("Build created successfully");
        setBuildDialogOpen(false);
        resetForm();
        loadBuilds();
      } else {
        toast.error("Failed to create build");
      }
    } catch (error) {
      toast.error("Error creating build");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBuild = async () => {
    if (!editingBuild || !buildName.trim()) {
      toast.error("Build name is required");
      return;
    }

    setLoading(true);
    try {
      const updated = await apiService.updateProjectBuild(editingBuild.id, {
        name: buildName,
        description: buildDescription
      });

      if (updated) {
        toast.success("Build updated successfully");
        setBuildDialogOpen(false);
        setEditingBuild(null);
        resetForm();
        loadBuilds();
      } else {
        toast.error("Failed to update build");
      }
    } catch (error) {
      toast.error("Error updating build");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBuild = async (build: Build) => {
    if (!confirm(`Are you sure you want to delete build "${build.name}"?`)) return;

    setLoading(true);
    try {
      const success = await apiService.deleteProjectBuild(build.id);
      if (success) {
        toast.success("Build deleted successfully");
        loadBuilds();
      } else {
        toast.error("Failed to delete build");
      }
    } catch (error) {
      toast.error("Error deleting build");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMappingDialog = async (build: Build) => {
    setSelectedBuild(build);
    await Promise.all([loadEquipment(), loadBuildMappings(build.id)]);
    setMappingDialogOpen(true);
  };

  const isMapped = (equipmentType: string, equipmentId: string) => {
    return buildMappings.some(m => m.equipmentType === equipmentType && m.equipmentId === equipmentId);
  };

  const handleToggleMapping = async (equipmentType: string, equipmentId: string) => {
    if (!selectedBuild) return;

    setSavingMapping(true);
    try {
      if (isMapped(equipmentType, equipmentId)) {
        await apiService.removeBuildMapping(selectedBuild.id, equipmentType, equipmentId);
        setBuildMappings(prev => prev.filter(m => 
          !(m.equipmentType === equipmentType && m.equipmentId === equipmentId)
        ));
        toast.success("Equipment removed from build");
      } else {
        await apiService.addBuildMapping(selectedBuild.id, equipmentType, equipmentId);
        setBuildMappings(prev => [...prev, { 
          buildId: selectedBuild.id, 
          equipmentType, 
          equipmentId 
        }]);
        toast.success("Equipment added to build");
      }
    } catch (error) {
      toast.error("Failed to update mapping");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleGenerateBin = async (build: Build) => {
    toast.info("Generating BIN file...");
    
    try {
      // Get build mappings and equipment
      const mappings = await apiService.getBuildMappings(build.id);
      const [lnbData, switchData, motorData, unicableData, satelliteData] = await Promise.all([
        apiService.getEquipment('lnbs'),
        apiService.getEquipment('switches'),
        apiService.getEquipment('motors'),
        apiService.getEquipment('unicables'),
        apiService.getSatellites()
      ]);

      // Filter equipment based on mappings
      const mappedLnbs = lnbData.filter(e => mappings.some(m => m.equipmentType === 'lnbs' && m.equipmentId === e.id));
      const mappedSwitches = switchData.filter(e => mappings.some(m => m.equipmentType === 'switches' && m.equipmentId === e.id));
      const mappedMotors = motorData.filter(e => mappings.some(m => m.equipmentType === 'motors' && m.equipmentId === e.id));
      const mappedUnicables = unicableData.filter(e => mappings.some(m => m.equipmentType === 'unicables' && m.equipmentId === e.id));
      const mappedSatellites = satelliteData.filter(e => mappings.some(m => m.equipmentType === 'satellites' && m.equipmentId === e.id));

      // Generate XML
      const xmlData = generateBuildXML(build, mappedLnbs, mappedSwitches, mappedMotors, mappedUnicables, mappedSatellites);
      
      // Save XML to build
      await apiService.updateProjectBuild(build.id, { xmlData });

      // Generate BIN
      const result = await apiService.generateBin(xmlData);
      
      if (result.success && result.data) {
        // Download the BIN file
        const binBuffer = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        const blob = new Blob([binBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${build.name.replace(/[^a-z0-9]/gi, '_')}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("BIN file generated and downloaded!");
      } else {
        toast.error(result.error || "Failed to generate BIN file");
      }
    } catch (error) {
      toast.error("Error generating BIN file");
      console.error(error);
    }
  };

  const generateBuildXML = (
    build: Build, 
    lnbs: any[], 
    switches: any[], 
    motors: any[], 
    unicables: any[], 
    satellites: any[]
  ) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<SDB>\n  <projinfo>\n';
    xml += `    <projname>${build.name}</projname>\n`;
    
    // LNBs
    if (lnbs.length > 0) {
      lnbs.forEach(lnb => {
        xml += `    <LNBlock>\n`;
        xml += `      <name>${lnb.name || ''}</name>\n`;
        xml += `      <LNBType>${lnb.type || ''}</LNBType>\n`;
        xml += `      <lowFreq>${lnb.lowFrequency || ''}</lowFreq>\n`;
        xml += `      <highFreq>${lnb.highFrequency || ''}</highFreq>\n`;
        xml += `    </LNBlock>\n`;
      });
    }

    // Switches
    if (switches.length > 0) {
      xml += `    <switchblock type='${switches[0]?.type || 'Dis'}' noofSwi='${switches.length}'>\n`;
      switches.forEach(sw => {
        xml += `      <switch>${sw.name || ''}</switch>\n`;
      });
      xml += `    </switchblock>\n`;
    }

    // Motors
    if (motors.length > 0) {
      motors.forEach(motor => {
        xml += `    <motor>\n`;
        xml += `      <name>${motor.name || ''}</name>\n`;
        xml += `      <type>${motor.type || ''}</type>\n`;
        xml += `      <position>${motor.position || ''}</position>\n`;
        xml += `    </motor>\n`;
      });
    }

    // Unicables
    if (unicables.length > 0) {
      unicables.forEach(uc => {
        xml += `    <unicable>\n`;
        xml += `      <name>${uc.name || ''}</name>\n`;
        xml += `      <type>${uc.type || ''}</type>\n`;
        xml += `      <port>${uc.port || ''}</port>\n`;
        xml += `    </unicable>\n`;
      });
    }

    // Satellites
    if (satellites.length > 0) {
      xml += `    <sattliteblock>\n`;
      satellites.forEach(sat => {
        xml += `      <sattliteinfo>\n`;
        xml += `        <name>${sat.name || ''}</name>\n`;
        xml += `        <position>${sat.orbitalPosition || ''}</position>\n`;
        xml += `        <polarization>${sat.polarization || ''}</polarization>\n`;
        if (sat.carriers && sat.carriers.length > 0) {
          sat.carriers.forEach((carrier: any) => {
            xml += `        <carrers>\n`;
            xml += `          <name>${carrier.name || ''}</name>\n`;
            xml += `          <frequency>${carrier.frequency || ''}</frequency>\n`;
            xml += `          <symbolRate>${carrier.symbolRate || ''}</symbolRate>\n`;
            if (carrier.services && carrier.services.length > 0) {
              carrier.services.forEach((service: any) => {
                xml += `          <services>\n`;
                xml += `            <name>${service.name || ''}</name>\n`;
                xml += `            <serviceType>${service.serviceType || ''}</serviceType>\n`;
                xml += `            <videoPid>${service.videoPid || ''}</videoPid>\n`;
                xml += `            <audioPid>${service.audioPid || ''}</audioPid>\n`;
                xml += `          </services>\n`;
              });
            }
            xml += `        </carrers>\n`;
          });
        }
        xml += `      </sattliteinfo>\n`;
      });
      xml += `    </sattliteblock>\n`;
    }

    xml += '  </projinfo>\n</SDB>';
    return xml;
  };

  const openEditDialog = (build: Build) => {
    setEditingBuild(build);
    setBuildName(build.name);
    setBuildDescription(build.description || "");
    setBuildDialogOpen(true);
  };

  const resetForm = () => {
    setBuildName("");
    setBuildDescription("");
    setEditingBuild(null);
  };

  const totalPages = Math.ceil(builds.length / itemsPerPage);
  const paginatedBuilds = builds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getProjectName = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project?.name || "Select a project";
  };

  const renderEquipmentSection = (title: string, items: any[], type: string, icon: React.ReactNode) => (
    <div className="space-y-2">
      <h4 className="font-medium flex items-center gap-2">
        {icon}
        {title} ({items.length})
      </h4>
      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="flex items-center space-x-2 p-2 border rounded">
            <Checkbox
              checked={isMapped(type, item.id)}
              onCheckedChange={() => handleToggleMapping(type, item.id)}
              disabled={savingMapping}
            />
            <span className="text-sm truncate">{item.name}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">No {title.toLowerCase()} available</p>
        )}
      </div>
    </div>
  );

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            Project Builds
          </h2>
          <p className="text-muted-foreground">
            Manage multiple builds for each project
          </p>
        </div>
        <Dialog open={buildDialogOpen} onOpenChange={setBuildDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!selectedProject}>
              <Plus className="mr-2 h-4 w-4" />
              New Build
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBuild ? "Edit Build" : "Create New Build"}</DialogTitle>
              <DialogDescription>
                {editingBuild ? "Update build details" : "Create a new build for the selected project"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Build Name</Label>
                <Input
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                  placeholder="Enter build name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={buildDescription}
                  onChange={(e) => setBuildDescription(e.target.value)}
                  placeholder="Enter build description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBuildDialogOpen(false)}>Cancel</Button>
              <Button onClick={editingBuild ? handleUpdateBuild : handleCreateBuild} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBuild ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Builds List */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>Builds for {getProjectName()}</CardTitle>
            <CardDescription>
              {builds.length} build(s) available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : builds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No builds found. Create your first build!
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedBuilds.map((build) => (
                  <div key={build.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{build.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {new Date(build.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      {build.description && (
                        <p className="text-sm text-muted-foreground mt-1">{build.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenMappingDialog(build)}>
                        <Settings className="h-4 w-4 mr-1" />
                        Mappings
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateBin(build)}>
                        <Download className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(build)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBuild(build)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="mt-4">
                <PaginationCustom
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipment Mappings - {selectedBuild?.name}</DialogTitle>
            <DialogDescription>
              Select equipment to include in this build
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderEquipmentSection("LNBs", lnbs, "lnbs", <Settings className="h-4 w-4" />)}
            {renderEquipmentSection("Switches", switches, "switches", <Settings className="h-4 w-4" />)}
            {renderEquipmentSection("Motors", motors, "motors", <Settings className="h-4 w-4" />)}
            {renderEquipmentSection("Unicables", unicables, "unicables", <Settings className="h-4 w-4" />)}
            {renderEquipmentSection("Satellites", satellites, "satellites", <Satellite className="h-4 w-4" />)}
          </div>
          <DialogFooter>
            <Button onClick={() => setMappingDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectBuilds;
