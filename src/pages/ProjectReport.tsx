import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Radio, Zap, RotateCcw, Activity, Satellite, Loader2, Package,
  ChevronRight, FolderOpen, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import InlineFormField from "@/components/InlineFormField";

const ProjectReport = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [configuredProjects, setConfiguredProjects] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedBuildId, setSelectedBuildId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Equipment & mappings
  const [allLnbs, setAllLnbs] = useState<any[]>([]);
  const [allSwitches, setAllSwitches] = useState<any[]>([]);
  const [allMotors, setAllMotors] = useState<any[]>([]);
  const [allUnicables, setAllUnicables] = useState<any[]>([]);
  const [allSatellites, setAllSatellites] = useState<any[]>([]);
  const [buildMappings, setBuildMappings] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadEquipment();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadBuilds(selectedProjectId);
      setSelectedBuildId("");
      setBuildMappings([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const loadBuildContext = async () => {
      if (selectedBuildId) {
        await Promise.all([
          loadBuildMappings(selectedBuildId),
          loadEquipment(selectedBuildId)
        ]);
      } else {
        setBuildMappings([]);
        await loadEquipment();
      }
    };

    loadBuildContext();
  }, [selectedBuildId]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const data = await apiService.getProjects();
      const allProjects = data || [];
      setProjects(allProjects);
      
      // Filter to only projects that have at least one build
      const projectsWithBuilds: any[] = [];
      for (const project of allProjects) {
        try {
          const projectBuilds = await apiService.getProjectBuilds(project.id);
          if (projectBuilds && projectBuilds.length > 0) {
            projectsWithBuilds.push(project);
          }
        } catch {
          // skip
        }
      }
      setConfiguredProjects(projectsWithBuilds);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadBuilds = async (projectId: string) => {
    setIsLoadingBuilds(true);
    try {
      const data = await apiService.getProjectBuilds(projectId);
      setBuilds(data || []);
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  const loadEquipment = async (buildId?: string) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuildMappings = async (buildId: string) => {
    setIsLoading(true);
    try {
      const mappings = await apiService.getBuildMappings(buildId);
      setBuildMappings(mappings || []);
    } finally {
      setIsLoading(false);
    }
  };

  const isMapped = (type: string, id: string) =>
    buildMappings.some(m => m.equipmentType === type && m.equipmentId === id);

  const getMapped = () => ({
    lnbs: allLnbs.filter(l => isMapped('lnbs', l.id)),
    switches: allSwitches.filter(s => isMapped('switches', s.id)),
    motors: allMotors.filter(m => isMapped('motors', m.id)),
    unicables: allUnicables.filter(u => isMapped('unicables', u.id)),
    satellites: allSatellites.filter(s => isMapped('satellites', s.id))
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedBuild = builds.find(b => b.id === selectedBuildId);
  const mapped = getMapped();

  const parseSwitchOptions = (options: any): string[] => {
    if (Array.isArray(options)) return options;
    if (typeof options === 'string') {
      try { return JSON.parse(options); } catch { return []; }
    }
    return [];
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            Project Report
          </h2>
          <p className="text-muted-foreground mt-1">Full details report for configured projects and builds</p>
        </div>
      </div>

      {/* Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Project">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a configured project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    {configuredProjects.length === 0 && !isLoadingProjects && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No configured projects found. Create a project with builds first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </InlineFormField>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <div className="flex-1 min-w-[200px]">
              <InlineFormField label="Build">
                <Select value={selectedBuildId} onValueChange={setSelectedBuildId} disabled={!selectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedProjectId ? "Select project first" : isLoadingBuilds ? "Loading..." : "Select a build"} />
                  </SelectTrigger>
                  <SelectContent>
                    {builds.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </InlineFormField>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {selectedBuildId && !isLoading ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card><CardContent className="p-4 text-center"><Radio className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{mapped.lnbs.length}</p><p className="text-xs text-muted-foreground">LNBs</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><Zap className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{mapped.switches.length}</p><p className="text-xs text-muted-foreground">Switches</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><RotateCcw className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{mapped.motors.length}</p><p className="text-xs text-muted-foreground">Motors</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><Activity className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{mapped.unicables.length}</p><p className="text-xs text-muted-foreground">Unicables</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><Satellite className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{mapped.satellites.length}</p><p className="text-xs text-muted-foreground">Satellites</p></CardContent></Card>
          </div>

          {/* LNBs */}
          {mapped.lnbs.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4" />LNBs</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Band</TableHead><TableHead>Low Freq</TableHead><TableHead>High Freq</TableHead><TableHead>LO1(H)</TableHead><TableHead>LO1(L)</TableHead><TableHead>Power</TableHead><TableHead>V-Control</TableHead><TableHead>22KHz</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mapped.lnbs.map(l => (
                      <TableRow key={l.id}><TableCell>{l.name}</TableCell><TableCell>{l.bandType || '-'}</TableCell><TableCell>{l.lowFrequency || '-'}</TableCell><TableCell>{l.highFrequency || '-'}</TableCell><TableCell>{l.lo1High || '-'}</TableCell><TableCell>{l.lo1Low || '-'}</TableCell><TableCell>{l.powerControl || '-'}</TableCell><TableCell>{l.vControl || '-'}</TableCell><TableCell>{l.khzOption || '-'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Switches */}
          {mapped.switches.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Switches</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Options</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mapped.switches.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.switchType || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {parseSwitchOptions(s.switchOptions).map((opt: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{opt}</Badge>
                            ))}
                            {parseSwitchOptions(s.switchOptions).length === 0 && '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Motors */}
          {mapped.motors.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" />Motors</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Position/Coords</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mapped.motors.map(m => (
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
          {mapped.unicables.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Unicables</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Port</TableHead><TableHead>Slots</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mapped.unicables.map(u => (
                      <TableRow key={u.id}><TableCell>{u.unicableType || '-'}</TableCell><TableCell>{u.status || '-'}</TableCell><TableCell>{u.port || '-'}</TableCell><TableCell>{(u.ifSlots || []).length} slots</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Satellites with full details */}
          {mapped.satellites.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Satellite className="h-4 w-4" />Satellites</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {mapped.satellites.map(sat => (
                  <Card key={sat.id} className="border">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{sat.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{sat.position}</Badge>
                          <Badge variant="outline">{sat.direction || 'N/A'}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {/* Equipment Mappings */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3 p-2 bg-muted/30 rounded">
                        <span>LNB: {allLnbs.find(l => l.id === sat.mappedLnb)?.name || 'None'}</span>
                        <span>Switch: {sat.mappedSwitch ? sat.mappedSwitch.split(',').map((id: string) => allSwitches.find(s => s.id === id)?.switchType).filter(Boolean).join(', ') : 'None'}</span>
                        <span>Motor: {allMotors.find(m => m.id === sat.mappedMotor)?.motorType || 'None'}</span>
                      </div>
                      {/* Carriers */}
                      {(sat.carriers || []).map((carrier: any, idx: number) => (
                        <div key={carrier.id || idx} className="mb-3 border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{carrier.name}</span>
                            <span className="text-xs text-muted-foreground">Freq: {carrier.frequency} | Pol: {carrier.polarization} | SR: {carrier.symbolRate || '-'} | FEC: {carrier.fec || '-'}</span>
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
                                  <TableHead className="py-1">Scramble</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(carrier.services || []).map((svc: any, sIdx: number) => (
                                  <TableRow key={svc.id || sIdx} className="text-xs">
                                    <TableCell className="py-1">{svc.name}</TableCell>
                                    <TableCell className="py-1">{svc.videoPid || '-'}</TableCell>
                                    <TableCell className="py-1">{svc.audioPid || '-'}</TableCell>
                                    <TableCell className="py-1">{svc.pcrPid || '-'}</TableCell>
                                    <TableCell className="py-1">{svc.programNumber || '-'}</TableCell>
                                    <TableCell className="py-1">{svc.scramble ? 'Yes' : 'No'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      ))}
                      {(sat.carriers || []).length === 0 && <p className="text-xs text-muted-foreground">No carriers</p>}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {mapped.lnbs.length === 0 && mapped.switches.length === 0 && mapped.motors.length === 0 && mapped.unicables.length === 0 && mapped.satellites.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No equipment mapped to this build yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : selectedBuildId && isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>{isLoadingProjects ? "Loading projects..." : "Select a configured project and build to view the report."}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectReport;
