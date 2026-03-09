import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio, Zap, RotateCcw, Loader2, Plus, Trash2, Save, Search, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import InlineFormField from "./InlineFormField";

interface EquipmentMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  satellite: any;
  onSave: (mappings: { lnbId: string; switchIds: string[]; motorId: string }) => void;
  allLnbs: any[];
  allSwitches: any[];
  allMotors: any[];
  onEquipmentUpdate: () => void;
}

const EquipmentMappingModal = ({
  open,
  onOpenChange,
  satellite,
  onSave,
  allLnbs,
  allSwitches,
  allMotors,
  onEquipmentUpdate
}: EquipmentMappingModalProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("lnb");
  const [isSaving, setIsSaving] = useState(false);
  
  const [lnbSearch, setLnbSearch] = useState("");
  const [switchSearch, setSwitchSearch] = useState("");
  const [motorSearch, setMotorSearch] = useState("");
  
  const [selectedLnbId, setSelectedLnbId] = useState<string>("");
  const [selectedSwitchIds, setSelectedSwitchIds] = useState<string[]>([]);
  const [selectedSwitchOption, setSelectedSwitchOption] = useState<string>(""); // single option per switch
  const [selectedMotorId, setSelectedMotorId] = useState<string>("");
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string>("");
  const [editFormData, setEditFormData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (satellite) {
      setSelectedLnbId(satellite.mappedLnb || (allLnbs.length > 0 ? allLnbs[0].id : ""));
      const switchId = satellite.mappedSwitch || "";
      setSelectedSwitchIds(switchId ? switchId.split(',').filter(Boolean) : []);
      setSelectedSwitchOption(satellite.mappedSwitchOption || "");
      setSelectedMotorId(satellite.mappedMotor || "");
    }
  }, [satellite, allLnbs]);

  const filteredLnbs = allLnbs.filter(l => 
    l.name?.toLowerCase().includes(lnbSearch.toLowerCase()) ||
    l.bandType?.toLowerCase().includes(lnbSearch.toLowerCase())
  );
  const filteredSwitches = allSwitches.map(s => ({
    ...s,
    switchOptions: Array.isArray(s.switchOptions) 
      ? s.switchOptions 
      : (typeof s.switchOptions === 'string' ? (() => { try { return JSON.parse(s.switchOptions); } catch { return []; } })() : [])
  })).filter(s =>
    s.switchType?.toLowerCase().includes(switchSearch.toLowerCase())
  );
  const filteredMotors = allMotors.filter(m =>
    m.motorType?.toLowerCase().includes(motorSearch.toLowerCase())
  );

  // Switch selection: Tone Burst always allowed + one DiSEqC. 
  // After selecting a switch, user picks ONE option from that switch's options.
  const handleSwitchToggle = (switchId: string) => {
    const switchItem = allSwitches.find(s => s.id === switchId);
    if (!switchItem) return;
    const isToneBurst = switchItem.switchType === "Tone Burst";
    
    if (selectedSwitchIds.includes(switchId)) {
      setSelectedSwitchIds(prev => prev.filter(id => id !== switchId));
    } else {
      if (isToneBurst) {
        setSelectedSwitchIds(prev => [...prev, switchId]);
      } else {
        // Remove existing DiSEqC, keep Tone Burst
        const newIds = selectedSwitchIds.filter(id => {
          const s = allSwitches.find(sw => sw.id === id);
          return s?.switchType === "Tone Burst";
        });
        setSelectedSwitchIds([...newIds, switchId]);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        lnbId: selectedLnbId,
        switchIds: selectedSwitchIds,
        motorId: selectedMotorId
      });
      onOpenChange(false);
      toast({ title: "Equipment Mapped", description: "Equipment mappings saved successfully." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (item: any, type: string) => {
    setEditingItem(item);
    setEditingType(type);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingType) return;
    setIsUpdating(true);
    try {
      await apiService.updateEquipment(editingType, editingItem.id, editFormData);
      toast({ title: "Updated", description: `Equipment updated successfully.` });
      setEditingItem(null);
      setEditingType("");
      onEquipmentUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to update equipment.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderLnbDetails = () => (
    <div className="space-y-2 text-sm">
      <InlineFormField label="Name"><Input value={editFormData.name || ""} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} /></InlineFormField>
      <InlineFormField label="Low Freq"><Input value={editFormData.lowFrequency || ""} onChange={(e) => setEditFormData({...editFormData, lowFrequency: e.target.value})} /></InlineFormField>
      <InlineFormField label="High Freq"><Input value={editFormData.highFrequency || ""} onChange={(e) => setEditFormData({...editFormData, highFrequency: e.target.value})} /></InlineFormField>
      <InlineFormField label="LO1(H)"><Input value={editFormData.lo1High || ""} onChange={(e) => setEditFormData({...editFormData, lo1High: e.target.value})} /></InlineFormField>
      <InlineFormField label="LO1(L)"><Input value={editFormData.lo1Low || ""} onChange={(e) => setEditFormData({...editFormData, lo1Low: e.target.value})} /></InlineFormField>
      <InlineFormField label="Band Type">
        <Select value={editFormData.bandType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, bandType: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">NONE</SelectItem>
            <SelectItem value="C-Band">C-Band</SelectItem>
            <SelectItem value="Ku-Band">Ku-Band</SelectItem>
            <SelectItem value="Ka-Band">Ka-Band</SelectItem>
          </SelectContent>
        </Select>
      </InlineFormField>
      <InlineFormField label="Power Control">
        <Select value={editFormData.powerControl || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, powerControl: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">NONE</SelectItem>
            <SelectItem value="13V">13V</SelectItem>
            <SelectItem value="18V">18V</SelectItem>
            <SelectItem value="Auto">Auto</SelectItem>
          </SelectContent>
        </Select>
      </InlineFormField>
      <InlineFormField label="V-Control">
        <Select value={editFormData.vControl || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, vControl: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">NONE</SelectItem>
            <SelectItem value="ON">ON</SelectItem>
            <SelectItem value="OFF">OFF</SelectItem>
          </SelectContent>
        </Select>
      </InlineFormField>
      <InlineFormField label="22KHz">
        <Select value={editFormData.khzOption || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, khzOption: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">NONE</SelectItem>
            <SelectItem value="ON">ON</SelectItem>
            <SelectItem value="OFF">OFF</SelectItem>
            <SelectItem value="Auto">Auto</SelectItem>
          </SelectContent>
        </Select>
      </InlineFormField>
    </div>
  );

  const renderSwitchDetails = () => {
    const options = Array.isArray(editFormData.switchOptions) ? editFormData.switchOptions : [];
    return (
      <div className="space-y-3 text-sm">
        <InlineFormField label="Type">
          <Select value={editFormData.switchType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, switchType: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">NONE</SelectItem>
              <SelectItem value="Tone Burst">Tone Burst</SelectItem>
              <SelectItem value="DiSEqC 1.0">DiSEqC 1.0</SelectItem>
              <SelectItem value="DiSEqC 1.1">DiSEqC 1.1</SelectItem>
            </SelectContent>
          </Select>
        </InlineFormField>
        <div>
          <Label className="text-sm font-medium mb-2 block">Options</Label>
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <Input value={opt} onChange={(e) => { const n = [...options]; n[idx] = e.target.value; setEditFormData({...editFormData, switchOptions: n}); }} placeholder={`Option ${idx + 1}`} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditFormData({...editFormData, switchOptions: options.filter((_: any, i: number) => i !== idx)})}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setEditFormData({...editFormData, switchOptions: [...options, ""]})}><Plus className="h-3 w-3 mr-1" /> Add Option</Button>
        </div>
      </div>
    );
  };

  const renderMotorDetails = () => (
    <div className="space-y-2 text-sm">
      <InlineFormField label="Type">
        <Select value={editFormData.motorType || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, motorType: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">NONE</SelectItem>
            <SelectItem value="DiSEqC 1.0">DiSEqC 1.0</SelectItem>
            <SelectItem value="DiSEqC 1.2">DiSEqC 1.2</SelectItem>
          </SelectContent>
        </Select>
      </InlineFormField>
      {editFormData.motorType === "DiSEqC 1.0" && (
        <InlineFormField label="Position"><Input value={editFormData.position || ""} onChange={(e) => setEditFormData({...editFormData, position: e.target.value})} placeholder="Position number" /></InlineFormField>
      )}
      {editFormData.motorType === "DiSEqC 1.2" && (
        <>
          <InlineFormField label="Longitude"><Input value={editFormData.longitude || ""} onChange={(e) => setEditFormData({...editFormData, longitude: e.target.value})} /></InlineFormField>
          <InlineFormField label="Latitude"><Input value={editFormData.latitude || ""} onChange={(e) => setEditFormData({...editFormData, latitude: e.target.value})} /></InlineFormField>
          <InlineFormField label="East/West">
            <Select value={editFormData.eastWest || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, eastWest: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NONE">NONE</SelectItem><SelectItem value="East">East</SelectItem><SelectItem value="West">West</SelectItem></SelectContent>
            </Select>
          </InlineFormField>
          <InlineFormField label="North/South">
            <Select value={editFormData.northSouth || "NONE"} onValueChange={(v) => setEditFormData({...editFormData, northSouth: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NONE">NONE</SelectItem><SelectItem value="North">North</SelectItem><SelectItem value="South">South</SelectItem></SelectContent>
            </Select>
          </InlineFormField>
        </>
      )}
    </div>
  );

  const renderItemCard = (item: any, type: string, isSelected: boolean, onSelect: () => void, icon: React.ReactNode) => {
    const isEditing = editingItem?.id === item.id && editingType === type;
    const switchOptions = Array.isArray(item.switchOptions) ? item.switchOptions : [];
    
    return (
      <Card key={item.id} className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" onClick={onSelect}>
              <Checkbox checked={isSelected} className="pointer-events-none" />
              {icon}
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">
                  {type === 'lnbs' ? item.name : type === 'switches' ? item.switchType : item.motorType}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {type === 'lnbs' && `${item.bandType || 'NONE'} | ${item.lowFrequency || '?'}-${item.highFrequency || '?'}`}
                  {type === 'switches' && `${switchOptions.length} options`}
                  {type === 'motors' && (item.motorType === 'DiSEqC 1.0' ? `Pos: ${item.position || 'NONE'}` : `${item.longitude || '?'}° ${item.eastWest || ''}`)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); if (isEditing) { setEditingItem(null); setEditingType(""); } else { handleStartEdit(item, type); } }}>
              {isEditing ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
            </Button>
          </div>
          {/* For switches: show option selector when selected */}
          {isSelected && type === 'switches' && switchOptions.length > 0 && (
            <div className="mt-2 pl-8">
              <Label className="text-xs text-muted-foreground mb-1 block">Choose one option for satellite:</Label>
              <Select value={selectedSwitchOption} onValueChange={setSelectedSwitchOption}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  {switchOptions.map((opt: string, idx: number) => (
                    <SelectItem key={idx} value={opt || `option-${idx}`}>{opt || `Option ${idx + 1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        {isEditing && (
          <CardContent className="pt-0 px-4 pb-4">
            <Separator className="mb-3" />
            {type === 'lnbs' && renderLnbDetails()}
            {type === 'switches' && renderSwitchDetails()}
            {type === 'motors' && renderMotorDetails()}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setEditingType(""); }}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl">Equipment Mapping - {satellite?.name}</DialogTitle>
          <DialogDescription>
            Select and configure equipment for this satellite. Click edit icon to modify details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 h-[65vh]">
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 mb-3">
                <TabsTrigger value="lnb" className="flex items-center gap-1">
                  <Radio className="h-3 w-3" /><span>LNB</span>
                  {selectedLnbId && <Badge variant="secondary" className="ml-1 text-xs">1</Badge>}
                </TabsTrigger>
                <TabsTrigger value="switch" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" /><span>Switch</span>
                  {selectedSwitchIds.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{selectedSwitchIds.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="motor" className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /><span>Motor</span>
                  {selectedMotorId && <Badge variant="secondary" className="ml-1 text-xs">1</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lnb" className="flex-1 overflow-hidden mt-0">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search LNBs..." value={lnbSearch} onChange={(e) => setLnbSearch(e.target.value)} className="pl-9" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Select one LNB. If none selected, first available LNB will be used.</p>
                <ScrollArea className="h-[calc(100%-80px)]">
                  <div className="space-y-2 pr-3">
                    {filteredLnbs.map(lnb => renderItemCard(lnb, 'lnbs', selectedLnbId === lnb.id, () => setSelectedLnbId(lnb.id), <Radio className="h-4 w-4 text-primary" />))}
                    {filteredLnbs.length === 0 && <p className="text-center py-8 text-muted-foreground">No LNBs found</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="switch" className="flex-1 overflow-hidden mt-0">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search Switches..." value={switchSearch} onChange={(e) => setSwitchSearch(e.target.value)} className="pl-9" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Tone Burst can combine with one DiSEqC. After selecting, choose one option for the satellite.</p>
                <ScrollArea className="h-[calc(100%-80px)]">
                  <div className="space-y-2 pr-3">
                    {filteredSwitches.map(sw => renderItemCard(sw, 'switches', selectedSwitchIds.includes(sw.id), () => handleSwitchToggle(sw.id), <Zap className="h-4 w-4 text-primary" />))}
                    {filteredSwitches.length === 0 && <p className="text-center py-8 text-muted-foreground">No switches found</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="motor" className="flex-1 overflow-hidden mt-0">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search Motors..." value={motorSearch} onChange={(e) => setMotorSearch(e.target.value)} className="pl-9" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Select one motor. Optional.</p>
                <ScrollArea className="h-[calc(100%-80px)]">
                  <div className="space-y-2 pr-3">
                    <Card className={`cursor-pointer transition-all ${!selectedMotorId ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedMotorId("")}>
                      <CardHeader className="py-3 px-4"><div className="flex items-center gap-2"><Checkbox checked={!selectedMotorId} className="pointer-events-none" /><CardTitle className="text-sm">None</CardTitle></div></CardHeader>
                    </Card>
                    {filteredMotors.map(motor => renderItemCard(motor, 'motors', selectedMotorId === motor.id, () => setSelectedMotorId(motor.id), <RotateCcw className="h-4 w-4 text-primary" />))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side: Summary */}
          <div className="w-72 border-l pl-4">
            <h3 className="font-medium mb-3">Selected Equipment</h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><Radio className="h-4 w-4 text-primary" /><span>LNB</span></div>
                <p className="text-sm text-muted-foreground">{selectedLnbId ? allLnbs.find(l => l.id === selectedLnbId)?.name : "Default (First available)"}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><Zap className="h-4 w-4 text-primary" /><span>Switch</span></div>
                {selectedSwitchIds.length > 0 ? (
                  <div className="space-y-1">
                    {selectedSwitchIds.map(id => {
                      const sw = allSwitches.find(s => s.id === id);
                      return <Badge key={id} variant="secondary" className="text-xs mr-1">{sw?.switchType}</Badge>;
                    })}
                    {selectedSwitchOption && <p className="text-xs text-muted-foreground mt-1">Option: {selectedSwitchOption}</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None</p>}
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><RotateCcw className="h-4 w-4 text-primary" /><span>Motor</span></div>
                <p className="text-sm text-muted-foreground">{selectedMotorId ? allMotors.find(m => m.id === selectedMotorId)?.motorType : "None"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Mappings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentMappingModal;
