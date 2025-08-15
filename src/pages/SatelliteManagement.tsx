import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Satellite, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SatelliteData {
  id: string;
  name: string;
  position: string;
  age: string;
  direction: string;
  services: string[];
  carriers: string[];
  lnbCount: number;
  switchCount: number;
  motorCount: number;
  unicableCount: number;
}

const SatelliteManagement = () => {
  const { toast } = useToast();
  const [satellites, setSatellites] = useState<SatelliteData[]>([
    {
      id: "1",
      name: "ASTRA 2E/2F/2G",
      position: "28.2°E",
      age: "Active since 2010",
      direction: "East",
      services: ["BBC", "ITV", "Sky Sports", "Channel 4"],
      carriers: ["Sky", "Freesat", "BBC"],
      lnbCount: 3,
      switchCount: 2,
      motorCount: 1,
      unicableCount: 1
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState<SatelliteData | null>(null);
  const [formData, setFormData] = useState<Partial<SatelliteData>>({});

  const directions = ["East", "West"];

  const handleAdd = () => {
    setEditingSatellite(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (satellite: SatelliteData) => {
    setEditingSatellite(satellite);
    setFormData({
      ...satellite,
      services: satellite.services,
      carriers: satellite.carriers
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setSatellites(satellites.filter(s => s.id !== id));
    toast({
      title: "Satellite Deleted",
      description: "The satellite has been successfully removed.",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const satelliteData = {
      ...formData,
      services: formData.services || [],
      carriers: formData.carriers || [],
      lnbCount: formData.lnbCount || 0,
      switchCount: formData.switchCount || 0,
      motorCount: formData.motorCount || 0,
      unicableCount: formData.unicableCount || 0
    } as SatelliteData;

    if (editingSatellite) {
      setSatellites(satellites.map(s => s.id === editingSatellite.id ? satelliteData : s));
      toast({
        title: "Satellite Updated",
        description: "The satellite has been successfully updated.",
      });
    } else {
      const newSatellite = {
        ...satelliteData,
        id: Date.now().toString(),
      };
      setSatellites([...satellites, newSatellite]);
      toast({
        title: "Satellite Added",
        description: "The new satellite has been successfully added.",
      });
    }
    
    setIsDialogOpen(false);
    setFormData({});
  };

  const parseList = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Satellite className="h-8 w-8 text-primary" />
            Satellite Management
          </h2>
          <p className="text-muted-foreground">
            Manage satellite information, services, and equipment assignments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Satellite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSatellite ? "Edit Satellite" : "Add New Satellite"}
              </DialogTitle>
              <DialogDescription>
                Configure satellite information and associated equipment
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Satellite Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ASTRA 2E/2F/2G"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., 28.2°E"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age/Status</Label>
                <Input
                  id="age"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g., Active since 2010"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={formData.direction || ""}
                  onValueChange={(value) => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {directions.map((dir) => (
                      <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="services">Services (comma-separated)</Label>
                <Textarea
                  id="services"
                  value={formData.services?.join(', ') || ""}
                  onChange={(e) => setFormData({ ...formData, services: parseList(e.target.value) })}
                  placeholder="e.g., BBC, ITV, Sky Sports, Channel 4"
                  rows={3}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="carriers">Carriers (comma-separated)</Label>
                <Textarea
                  id="carriers"
                  value={formData.carriers?.join(', ') || ""}
                  onChange={(e) => setFormData({ ...formData, carriers: parseList(e.target.value) })}
                  placeholder="e.g., Sky, Freesat, BBC"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lnbCount">Connected LNBs</Label>
                <Input
                  id="lnbCount"
                  type="number"
                  value={formData.lnbCount || 0}
                  onChange={(e) => setFormData({ ...formData, lnbCount: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="switchCount">Connected Switches</Label>
                <Input
                  id="switchCount"
                  type="number"
                  value={formData.switchCount || 0}
                  onChange={(e) => setFormData({ ...formData, switchCount: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motorCount">Connected Motors</Label>
                <Input
                  id="motorCount"
                  type="number"
                  value={formData.motorCount || 0}
                  onChange={(e) => setFormData({ ...formData, motorCount: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unicableCount">Connected Unicables</Label>
                <Input
                  id="unicableCount"
                  type="number"
                  value={formData.unicableCount || 0}
                  onChange={(e) => setFormData({ ...formData, unicableCount: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingSatellite ? "Update" : "Add"} Satellite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {satellites.map((satellite) => (
          <Card key={satellite.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                    <Satellite className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{satellite.name}</CardTitle>
                    <CardDescription>
                      Position: {satellite.position} • Direction: {satellite.direction}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(satellite)}
                    className="text-primary hover:text-primary-hover"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(satellite.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Info className="w-4 h-4 mr-2 text-primary" />
                      Information
                    </h4>
                    <p className="text-sm text-muted-foreground">{satellite.age}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {satellite.services.map((service, index) => (
                        <Badge key={index} variant="outline">{service}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Carriers</h4>
                    <div className="flex flex-wrap gap-2">
                      {satellite.carriers.map((carrier, index) => (
                        <Badge key={index} variant="secondary">{carrier}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Connected Equipment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{satellite.lnbCount}</div>
                      <div className="text-sm text-muted-foreground">LNBs</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{satellite.switchCount}</div>
                      <div className="text-sm text-muted-foreground">Switches</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{satellite.motorCount}</div>
                      <div className="text-sm text-muted-foreground">Motors</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{satellite.unicableCount}</div>
                      <div className="text-sm text-muted-foreground">Unicables</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SatelliteManagement;