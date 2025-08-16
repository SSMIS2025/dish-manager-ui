import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Satellite, Settings, CheckCircle } from "lucide-react";
import { storageService } from "@/services/storageService";
import { useToast } from "@/hooks/use-toast";

interface SatelliteStepFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  username: string;
  onSave: () => void;
}

interface SatelliteData {
  name: string;
  position: string;
  age: string;
  direction: string;
  services: string[];
  carriers: string[];
  supportedEquipment: string[];
}

interface EquipmentDetails {
  lnb?: any;
  switch?: any;
  motor?: any;
  unicable?: any;
}

const SatelliteStepForm = ({ isOpen, onClose, projectId, username, onSave }: SatelliteStepFormProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [satelliteData, setSatelliteData] = useState<SatelliteData>({
    name: "",
    position: "",
    age: "",
    direction: "",
    services: [],
    carriers: [],
    supportedEquipment: []
  });
  const [equipmentDetails, setEquipmentDetails] = useState<EquipmentDetails>({});

  const directions = ["East", "West"];
  const equipmentTypes = [
    { id: "lnb", name: "LNB", icon: "📡" },
    { id: "switch", name: "Switch", icon: "🔀" },
    { id: "motor", name: "Motor", icon: "⚙️" },
    { id: "unicable", name: "Unicable", icon: "📶" }
  ];

  const lnbBandTypes = [
    "Universal LNB", "Wideband LNB", "Quad LNB", "Octo LNB", 
    "C-Band LNB", "Ku-Band LNB", "Ka-Band LNB", "Multi-Band LNB"
  ];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!satelliteData.name || !satelliteData.position) {
        toast({
          title: "Validation Error",
          description: "Please fill in satellite name and position.",
          variant: "destructive"
        });
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    setSatelliteData(prev => ({
      ...prev,
      supportedEquipment: checked 
        ? [...prev.supportedEquipment, equipmentId]
        : prev.supportedEquipment.filter(id => id !== equipmentId)
    }));
  };

  const handleEquipmentDetails = (type: string, details: any) => {
    setEquipmentDetails(prev => ({
      ...prev,
      [type]: details
    }));
  };

  const parseList = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  const handleSave = () => {
    try {
      // Save satellite
      const satellite = storageService.saveEquipment('satellites', {
        ...satelliteData,
        type: 'satellite'
      }, projectId);

      // Save associated equipment
      satelliteData.supportedEquipment.forEach(equipmentType => {
        if (equipmentDetails[equipmentType]) {
          storageService.saveEquipment(`${equipmentType}s`, {
            ...equipmentDetails[equipmentType],
            satelliteId: satellite.id,
            type: equipmentType
          }, projectId);
        }
      });

      storageService.logActivity(
        username,
        "Satellite Created",
        `Created satellite: ${satelliteData.name} with associated equipment`,
        projectId
      );

      toast({
        title: "Satellite Created",
        description: "Satellite and associated equipment have been successfully created.",
      });

      onSave();
      onClose();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create satellite. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSatelliteData({
      name: "",
      position: "",
      age: "",
      direction: "",
      services: [],
      carriers: [],
      supportedEquipment: []
    });
    setEquipmentDetails({});
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Satellite className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold">Satellite Information</h3>
        <p className="text-muted-foreground">Enter basic satellite details</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Satellite Name *</Label>
          <Input
            id="name"
            value={satelliteData.name}
            onChange={(e) => setSatelliteData({...satelliteData, name: e.target.value})}
            placeholder="e.g., ASTRA 2E/2F/2G"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            value={satelliteData.position}
            onChange={(e) => setSatelliteData({...satelliteData, position: e.target.value})}
            placeholder="e.g., 28.2°E"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Age/Status</Label>
          <Input
            id="age"
            value={satelliteData.age}
            onChange={(e) => setSatelliteData({...satelliteData, age: e.target.value})}
            placeholder="e.g., Active since 2010"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="direction">Direction</Label>
          <Select
            value={satelliteData.direction}
            onValueChange={(value) => setSatelliteData({...satelliteData, direction: value})}
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
            value={satelliteData.services.join(', ')}
            onChange={(e) => setSatelliteData({...satelliteData, services: parseList(e.target.value)})}
            placeholder="e.g., BBC, ITV, Sky Sports, Channel 4"
            rows={3}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="carriers">Carriers (comma-separated)</Label>
          <Textarea
            id="carriers"
            value={satelliteData.carriers.join(', ')}
            onChange={(e) => setSatelliteData({...satelliteData, carriers: parseList(e.target.value)})}
            placeholder="e.g., Sky, Freesat, BBC"
            rows={2}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold">Supported Equipment</h3>
        <p className="text-muted-foreground">Select equipment types this satellite supports</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {equipmentTypes.map((equipment) => (
          <Card key={equipment.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <Checkbox
                id={equipment.id}
                checked={satelliteData.supportedEquipment.includes(equipment.id)}
                onCheckedChange={(checked) => handleEquipmentToggle(equipment.id, checked as boolean)}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{equipment.icon}</span>
                  <Label htmlFor={equipment.id} className="text-lg font-medium cursor-pointer">
                    {equipment.name}
                  </Label>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {satelliteData.supportedEquipment.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Selected Equipment:</h4>
          <div className="flex flex-wrap gap-2">
            {satelliteData.supportedEquipment.map((equipmentId) => {
              const equipment = equipmentTypes.find(e => e.id === equipmentId);
              return (
                <Badge key={equipmentId} variant="secondary">
                  {equipment?.icon} {equipment?.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold">Equipment Details</h3>
        <p className="text-muted-foreground">Configure details for selected equipment</p>
      </div>

      {satelliteData.supportedEquipment.map((equipmentType) => (
        <Card key={equipmentType} className="p-4">
          <h4 className="font-semibold mb-3 capitalize">{equipmentType} Configuration</h4>
          
          {equipmentType === 'lnb' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>LNB Name</Label>
                  <Input
                    value={equipmentDetails.lnb?.name || ''}
                    onChange={(e) => handleEquipmentDetails('lnb', {
                      ...equipmentDetails.lnb,
                      name: e.target.value
                    })}
                    placeholder="Enter LNB name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Band Type</Label>
                  <Select
                    value={equipmentDetails.lnb?.bandType || ''}
                    onValueChange={(value) => handleEquipmentDetails('lnb', {
                      ...equipmentDetails.lnb,
                      bandType: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select band type" />
                    </SelectTrigger>
                    <SelectContent>
                      {lnbBandTypes.map((band) => (
                        <SelectItem key={band} value={band}>{band}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency Range</Label>
                  <Input
                    value={equipmentDetails.lnb?.frequency || ''}
                    onChange={(e) => handleEquipmentDetails('lnb', {
                      ...equipmentDetails.lnb,
                      frequency: e.target.value
                    })}
                    placeholder="e.g., 10.7-12.75 GHz"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Noise Figure</Label>
                  <Input
                    value={equipmentDetails.lnb?.noiseFigure || ''}
                    onChange={(e) => handleEquipmentDetails('lnb', {
                      ...equipmentDetails.lnb,
                      noiseFigure: e.target.value
                    })}
                    placeholder="e.g., 0.1 dB"
                  />
                </div>
              </div>
            </div>
          )}

          {equipmentType === 'switch' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Switch Name</Label>
                <Input
                  value={equipmentDetails.switch?.name || ''}
                  onChange={(e) => handleEquipmentDetails('switch', {
                    ...equipmentDetails.switch,
                    name: e.target.value
                  })}
                  placeholder="Enter switch name"
                />
              </div>
              <div className="space-y-2">
                <Label>Port Count</Label>
                <Input
                  type="number"
                  value={equipmentDetails.switch?.ports || ''}
                  onChange={(e) => handleEquipmentDetails('switch', {
                    ...equipmentDetails.switch,
                    ports: parseInt(e.target.value) || 0
                  })}
                  placeholder="e.g., 4"
                />
              </div>
            </div>
          )}

          {equipmentType === 'motor' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motor Name</Label>
                <Input
                  value={equipmentDetails.motor?.name || ''}
                  onChange={(e) => handleEquipmentDetails('motor', {
                    ...equipmentDetails.motor,
                    name: e.target.value
                  })}
                  placeholder="Enter motor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Motor Type</Label>
                <Select
                  value={equipmentDetails.motor?.motorType || ''}
                  onValueChange={(value) => handleEquipmentDetails('motor', {
                    ...equipmentDetails.motor,
                    motorType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select motor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DiSEqC 1.2">DiSEqC 1.2</SelectItem>
                    <SelectItem value="DiSEqC 1.3">DiSEqC 1.3</SelectItem>
                    <SelectItem value="USALS">USALS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {equipmentType === 'unicable' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unicable Name</Label>
                <Input
                  value={equipmentDetails.unicable?.name || ''}
                  onChange={(e) => handleEquipmentDetails('unicable', {
                    ...equipmentDetails.unicable,
                    name: e.target.value
                  })}
                  placeholder="Enter unicable name"
                />
              </div>
              <div className="space-y-2">
                <Label>User Band Count</Label>
                <Input
                  type="number"
                  value={equipmentDetails.unicable?.userBands || ''}
                  onChange={(e) => handleEquipmentDetails('unicable', {
                    ...equipmentDetails.unicable,
                    userBands: parseInt(e.target.value) || 0
                  })}
                  placeholder="e.g., 8"
                />
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Satellite className="w-6 h-6 text-primary" />
            <span>Create New Satellite</span>
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of 3: Configure your satellite and associated equipment
          </DialogDescription>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div className="flex justify-between pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave}>
                Create Satellite
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SatelliteStepForm;