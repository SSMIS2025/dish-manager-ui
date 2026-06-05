import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileCode, Check, Loader2, Radio, Zap, RotateCcw, Activity, Satellite,
  FolderPlus, FolderOpen, ArrowLeft, Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { STORAGE_MODE } from "@/config/database";
import { parseSDBXML, ParsedProjectData } from "@/services/xmlBuilder";

interface CreateProjectFromBinProps {
  username: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

type Step = "select-project" | "upload-bin";

const CreateProjectFromBin = ({ username }: CreateProjectFromBinProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-project");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [binFile, setBinFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProjectData | null>(null);
  const [rawXml, setRawXml] = useState<string>("");
  const [buildName, setBuildName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const list = await apiService.getProjects();
      setProjects(list || []);
    } finally {
      setLoadingProjects(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleContinueToUpload = async () => {
    if (createNewProject) {
      if (!newProjectName.trim()) {
        toast({ title: "Validation", description: "Project name is required", variant: "destructive" });
        return;
      }
      const duplicate = await apiService.checkProjectDuplicate(newProjectName);
      if (duplicate) {
        toast({ title: "Duplicate", description: "Project name already exists", variant: "destructive" });
        return;
      }
      const created = await apiService.saveProject({
        name: newProjectName,
        description: newProjectDescription,
        createdBy: username,
      });
      if (created) {
        await loadProjects();
        setSelectedProjectId(created.id);
        setCreateNewProject(false);
        setStep("upload-bin");
      }
    } else {
      if (!selectedProjectId) {
        toast({ title: "Validation", description: "Select a project to continue", variant: "destructive" });
        return;
      }
      setStep("upload-bin");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      toast({ title: "Invalid File", description: "Please select a .bin file", variant: "destructive" });
      return;
    }
    setBinFile(file);
    setBuildName(file.name.replace(/\.bin$/i, ""));
    await parseBinFile(file);
  };

  const parseBinFile = async (file: File) => {
    setIsLoading(true);
    try {
      if (STORAGE_MODE === "local") {
        toast({
          title: "Local Mode",
          description: "Bin parsing requires backend. Showing sample preview.",
        });
        const sample: ParsedProjectData = {
          name: file.name.replace(/\.bin$/i, ""),
          description: "Imported from bin file",
          lnbs: [{ name: "Sample LNB", lnbType: "UNIVERSAL_LNB", bandType: "Ku", lowFrequency: "9750", highFrequency: "10600" }],
          switches: [],
          motors: [],
          unicables: [],
          satellites: [],
        };
        setParsedData(sample);
        setRawXml("");
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await apiService.importBin(base64);
        if (result.success && result.data) {
          setRawXml(result.data);
          const parsed = parseSDBXML(result.data);
          setParsedData(parsed);
          toast({ title: "Parsed", description: "Review the data below and confirm to import." });
        } else {
          toast({ title: "Parse Error", description: result.error || "Failed to parse bin", variant: "destructive" });
        }
        setIsLoading(false);
      };
      reader.onerror = () => setIsLoading(false);
      reader.readAsDataURL(file);
    } catch {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !selectedProjectId) return;
    if (!buildName.trim()) {
      toast({ title: "Validation", description: "Build name is required", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      // Create a new build under the selected project. Equipment is stored
      // as build-specific overrides (no global mutation).
      const build = await apiService.createProjectBuild({
        projectId: selectedProjectId,
        name: buildName,
        description: `Imported from ${binFile?.name || "bin"}`,
        xmlData: rawXml,
        createdBy: username,
      });
      if (!build) {
        toast({ title: "Error", description: "Failed to create build", variant: "destructive" });
        return;
      }

      // Persist each parsed item as a build-mapping override so it shows up
      // in the project mapping view for this build without affecting global.
      const types: (keyof ParsedProjectData)[] = ["lnbs", "switches", "motors", "unicables", "satellites"];
      for (const type of types) {
        const items = parsedData[type] as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const synthId = `imp_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await apiService.setMappingOverride(build.id, type as string, synthId, { ...item, id: synthId, _imported: true });
          await apiService.addBuildMapping(build.id, type as string, synthId);
        }
      }

      await apiService.logActivity(
        username,
        "Project Imported from Bin",
        `Build "${buildName}" added to project "${selectedProject?.name}"`,
        selectedProjectId,
      );
      toast({
        title: "Import Complete",
        description: `Build "${buildName}" added to project "${selectedProject?.name}". Global data not affected.`,
      });

      // Reset to step 1
      setBinFile(null);
      setParsedData(null);
      setRawXml("");
      setBuildName("");
      setStep("select-project");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsCreating(false);
    }
  };

  const getEquipmentIcon = (type: string) => {
    const icons: Record<string, any> = { lnbs: Radio, switches: Zap, motors: RotateCcw, unicables: Activity, satellites: Satellite };
    return icons[type] || Radio;
  };

  // ---------- Step 1: Choose project ----------
  if (step === "select-project") {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            Create Project from BIN
          </h2>
          <p className="text-muted-foreground mt-1">
            Step 1 of 2 — Choose an existing project (or create a new one) to import the BIN into.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Select Project
            </CardTitle>
            <CardDescription>
              The imported BIN data is added as a new <b>build</b> under this project. Global equipment data is not modified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!createNewProject && (
              <div className="space-y-2">
                <Label>Existing Projects ({projects.length})</Label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading projects...
                  </div>
                ) : (
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
                    <SelectContent>
                      {projects.length === 0 ? (
                        <SelectItem value="none" disabled>No projects available</SelectItem>
                      ) : (
                        projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="sm" onClick={() => setCreateNewProject(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" /> Or create a new project
                </Button>
              </div>
            )}

            {createNewProject && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">New Project Details</Label>
                  <Button variant="ghost" size="sm" onClick={() => setCreateNewProject(false)}>
                    Cancel
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Enter project name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newProjectDescription} onChange={e => setNewProjectDescription(e.target.value)} rows={2} />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleContinueToUpload} disabled={!createNewProject && !selectedProjectId}>
                Continue to BIN Upload →
              </Button>
            </div>
          </CardContent>
        </Card>

        {projects.length > 0 && !createNewProject && (
          <Card>
            <CardHeader><CardTitle className="text-base">Project List</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {projects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedProjectId === p.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
                        </div>
                        {selectedProjectId === p.id && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ---------- Step 2: Upload BIN ----------
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary-foreground" />
            </div>
            Import BIN
          </h2>
          <p className="text-muted-foreground mt-1">
            Step 2 of 2 — Importing into <b>{selectedProject?.name}</b>
          </p>
        </div>
        <Button variant="outline" onClick={() => setStep("select-project")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Change Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileCode className="h-5 w-5" /> Upload Bin File</CardTitle>
            <CardDescription>Select a .bin file to parse and import as a new build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".bin" onChange={handleFileSelect} className="hidden" />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p>Parsing bin file...</p>
                </div>
              ) : binFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Check className="h-10 w-10 text-green-500" />
                  <p className="font-medium">{binFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(binFile.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p>Click to select a .bin file</p>
                </div>
              )}
            </div>

            {parsedData && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Build Name *</Label>
                  <Input value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="Enter build name" />
                </div>
                <Button onClick={handleImport} className="w-full" disabled={isCreating}>
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                    : <><FolderPlus className="mr-2 h-4 w-4" />Create Build in "{selectedProject?.name}"</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parsed Data Preview</CardTitle>
            <CardDescription>Review before importing. Items are saved only on this build.</CardDescription>
          </CardHeader>
          <CardContent>
            {!parsedData ? (
              <div className="text-center text-muted-foreground py-10">Upload a bin file to preview data</div>
            ) : (
              <Tabs defaultValue="lnbs">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="lnbs" className="text-xs">LNBs ({parsedData.lnbs.length})</TabsTrigger>
                  <TabsTrigger value="switches" className="text-xs">Switches ({parsedData.switches.length})</TabsTrigger>
                  <TabsTrigger value="motors" className="text-xs">Motors ({parsedData.motors.length})</TabsTrigger>
                  <TabsTrigger value="unicables" className="text-xs">Unicables ({parsedData.unicables.length})</TabsTrigger>
                  <TabsTrigger value="satellites" className="text-xs">Satellites ({parsedData.satellites.length})</TabsTrigger>
                </TabsList>
                {(["lnbs", "switches", "motors", "unicables", "satellites"] as const).map(type => {
                  const Icon = getEquipmentIcon(type);
                  const items = parsedData[type] as any[];
                  return (
                    <TabsContent key={type} value={type}>
                      <ScrollArea className="h-[400px]">
                        {items.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">No {type} found</div>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{item.name || `${type.slice(0, -1)} ${index + 1}`}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(item).map(([key, value]) => {
                                    if (key === "name" || key === "carriers" || key === "services" || key === "switchOptions" || key === "ifSlots") return null;
                                    return (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                                        <span>{String(value) || "-"}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                {type === "satellites" && item.carriers?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <Badge variant="secondary">{item.carriers.length} Carriers</Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProjectFromBin;
