import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileCode, Check, X, Loader2, Radio, Zap, RotateCcw, Activity, Satellite, FolderPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { STORAGE_MODE } from "@/config/database";

interface CreateProjectFromBinProps {
  username: string;
}

interface ParsedProjectData {
  name: string;
  description: string;
  lnbs: any[];
  switches: any[];
  motors: any[];
  unicables: any[];
  satellites: any[];
}

const CreateProjectFromBin = ({ username }: CreateProjectFromBinProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [binFile, setBinFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProjectData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.bin')) {
      toast({
        title: "Invalid File",
        description: "Please select a .bin file",
        variant: "destructive"
      });
      return;
    }

    setBinFile(file);
    await parseBinFile(file);
  };

  const parseBinFile = async (file: File) => {
    setIsLoading(true);
    try {
      if (STORAGE_MODE === 'local') {
        // Mock parsing for local mode - simulate XML parsing
        toast({
          title: "Local Mode",
          description: "Bin parsing requires MySQL backend. Using sample data for demonstration.",
        });
        
        // Sample parsed data for demo
        setParsedData({
          name: file.name.replace('.bin', ''),
          description: "Imported from bin file",
          lnbs: [{ name: "Sample LNB", lnbType: "Universal", bandType: "Ku", lowFrequency: "9750", highFrequency: "10600" }],
          switches: [{ name: "Sample Switch", switchType: "Dis1", switchConfiguration: "123" }],
          motors: [],
          unicables: [],
          satellites: [{ name: "Sample Satellite", position: "28.2E", direction: "East", carriers: [] }]
        });
        setProjectName(file.name.replace('.bin', ''));
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await apiService.importBin(base64);
        
        if (result.success && result.data) {
          // Parse XML data
          const parsed = parseXMLToProjectData(result.data);
          setParsedData(parsed);
          setProjectName(parsed.name || file.name.replace('.bin', ''));
          setProjectDescription(parsed.description || "");
          toast({
            title: "Bin Parsed Successfully",
            description: "Review the data below and confirm to create the project."
          });
        } else {
          toast({
            title: "Parse Error",
            description: result.error || "Failed to parse bin file",
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsLoading(false);
    }
  };

  const parseXMLToProjectData = (xmlString: string): ParsedProjectData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");
    
    const projectData: ParsedProjectData = {
      name: "",
      description: "",
      lnbs: [],
      switches: [],
      motors: [],
      unicables: [],
      satellites: []
    };

    // Parse project info
    const projInfo = doc.querySelector("projinfo");
    const projName = projInfo?.querySelector("projname");
    projectData.name = projName?.textContent || "Imported Project";

    // Parse LNBs
    const lnbBlock = doc.querySelector("LNBlock");
    if (lnbBlock) {
      const lnbType = lnbBlock.querySelector("LNBType")?.textContent || "";
      projectData.lnbs.push({
        name: `LNB-${lnbType}`,
        lnbType: lnbType,
        bandType: "Ku",
        lowFrequency: "9750",
        highFrequency: "10600"
      });
    }

    // Parse Switches
    const switchBlock = doc.querySelector("switchblock");
    if (switchBlock) {
      const switchType = switchBlock.getAttribute("type") || "Dis1";
      const switches = switchBlock.querySelectorAll("switch");
      switches.forEach((sw, index) => {
        projectData.switches.push({
          name: `Switch-${index + 1}`,
          switchType: switchType,
          switchConfiguration: sw.textContent || ""
        });
      });
    }

    // Parse Motors
    const motorBlock = doc.querySelector("motor");
    if (motorBlock && motorBlock.textContent?.trim()) {
      projectData.motors.push({
        name: "Motor-1",
        type: "USALS",
        position: "0",
        status: "Active"
      });
    }

    // Parse Unicables
    const unicableBlock = doc.querySelector("unicable");
    if (unicableBlock && unicableBlock.textContent?.trim()) {
      projectData.unicables.push({
        name: "Unicable-1",
        type: "DSCR",
        status: "Active"
      });
    }

    // Parse Satellites
    const satelliteBlock = doc.querySelector("sattliteblock");
    if (satelliteBlock) {
      const satInfos = satelliteBlock.querySelectorAll("sattliteinfo");
      satInfos.forEach((satInfo, index) => {
        const carriers: any[] = [];
        const carrierElements = satInfo.querySelectorAll("carrers");
        carrierElements.forEach((carrier, cIndex) => {
          const services: any[] = [];
          const serviceElements = carrier.querySelectorAll("services");
          serviceElements.forEach((service, sIndex) => {
            services.push({
              name: service.textContent || `Service-${sIndex + 1}`,
              frequency: "",
              videoPid: "",
              pcrPid: "",
              programNumber: ""
            });
          });
          carriers.push({
            name: `Carrier-${cIndex + 1}`,
            frequency: "",
            polarization: "Horizontal",
            symbolRate: "",
            fec: "Auto",
            services
          });
        });
        
        projectData.satellites.push({
          name: `Satellite-${index + 1}`,
          position: "",
          direction: "East",
          carriers
        });
      });
    }

    return projectData;
  };

  const handleCreateProject = async () => {
    if (!parsedData) return;

    if (!projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate project name
    const isDuplicate = await apiService.checkProjectDuplicate(projectName);
    if (isDuplicate) {
      toast({
        title: "Duplicate Name",
        description: "A project with this name already exists",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const projectDataWithName = {
        ...parsedData,
        name: projectName,
        description: projectDescription
      };

      const project = await apiService.createProjectFromXML(projectDataWithName, username);
      
      if (project) {
        await apiService.logActivity(username, "Project Created from Bin", `Created project: ${projectName}`, project.id);
        toast({
          title: "Project Created",
          description: `Project "${projectName}" has been created with all equipment and mappings.`
        });
        
        // Reset form
        setParsedData(null);
        setBinFile(null);
        setProjectName("");
        setProjectDescription("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getEquipmentIcon = (type: string) => {
    const icons: Record<string, any> = {
      lnbs: Radio,
      switches: Zap,
      motors: RotateCcw,
      unicables: Activity,
      satellites: Satellite
    };
    return icons[type] || Radio;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary-foreground" />
          </div>
          Create Project from Bin
        </h2>
        <p className="text-muted-foreground mt-1">
          Upload a bin file to create a new project with all equipment data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Upload Bin File
            </CardTitle>
            <CardDescription>
              Select a .bin file to parse and import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".bin"
                onChange={handleFileSelect}
                className="hidden"
              />
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
                  <p>Click to select or drag and drop</p>
                  <p className="text-sm text-muted-foreground">Only .bin files are accepted</p>
                </div>
              )}
            </div>

            {parsedData && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleCreateProject} 
                  className="w-full"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Project...</>
                  ) : (
                    <><FolderPlus className="mr-2 h-4 w-4" />Create Project</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Parsed Data Preview</CardTitle>
            <CardDescription>
              Review the equipment data before creating the project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!parsedData ? (
              <div className="text-center text-muted-foreground py-10">
                Upload a bin file to preview data
              </div>
            ) : (
              <Tabs defaultValue="lnbs" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="lnbs" className="text-xs">LNBs ({parsedData.lnbs.length})</TabsTrigger>
                  <TabsTrigger value="switches" className="text-xs">Switches ({parsedData.switches.length})</TabsTrigger>
                  <TabsTrigger value="motors" className="text-xs">Motors ({parsedData.motors.length})</TabsTrigger>
                  <TabsTrigger value="unicables" className="text-xs">Unicables ({parsedData.unicables.length})</TabsTrigger>
                  <TabsTrigger value="satellites" className="text-xs">Satellites ({parsedData.satellites.length})</TabsTrigger>
                </TabsList>
                
                {['lnbs', 'switches', 'motors', 'unicables', 'satellites'].map((type) => {
                  const Icon = getEquipmentIcon(type);
                  const items = parsedData[type as keyof ParsedProjectData] as any[];
                  
                  return (
                    <TabsContent key={type} value={type}>
                      <ScrollArea className="h-[400px]">
                        {items.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No {type} found in bin file
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{item.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(item).map(([key, value]) => {
                                    if (key === 'name' || key === 'carriers' || key === 'services') return null;
                                    return (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                        <span>{String(value) || '-'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                {type === 'satellites' && item.carriers?.length > 0 && (
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
