import { NavLink } from "react-router-dom";
import { 
  Satellite, 
  Radio, 
  Settings, 
  Zap, 
  LayoutDashboard,
  ChevronLeft,
  Activity,
  FolderOpen,
  RotateCcw,
  Menu,
  Upload,
  Package,
  ChevronDown,
  FileText,
  User
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
}

const equipmentItems = [
  { name: "LNB Management", href: "/lnb", icon: Radio },
  { name: "Switch Management", href: "/switch", icon: Zap },
  { name: "Motor Management", href: "/motor", icon: RotateCcw },
  { name: "Unicable Management", href: "/unicable", icon: Activity },
];

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: false },
  { name: "Satellite", href: "/satellite", icon: Satellite, adminOnly: false },
  { name: "Project Mapping", href: "/project-mapping", icon: FolderOpen, adminOnly: false },
  { name: "Project Builds", href: "/project-builds", icon: Package, adminOnly: false },
  { name: "Project Report", href: "/project-report", icon: FileText, adminOnly: false },
  { name: "Create from Bin", href: "/create-from-bin", icon: Upload, adminOnly: false },
  { name: "User Activity", href: "/admin/activity", icon: Settings, adminOnly: true },
];

const Sidebar = ({ collapsed, onToggle, isAdmin }: SidebarProps) => {
  const [equipmentOpen, setEquipmentOpen] = useState(true);
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin);

  const renderNavItem = (item: typeof navigation[0]) => (
    <Tooltip key={item.name}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) =>
            cn(
              "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed ? "justify-center p-3 mx-1" : "px-3 py-2.5 mx-2"
            )
          }
        >
          <item.icon className={cn(
            "shrink-0 transition-all duration-200",
            collapsed ? "h-5 w-5" : "h-[18px] w-[18px] mr-3"
          )} />
          {!collapsed && (
            <span className="truncate text-[13px]">{item.name}</span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg z-50">
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col border-r transition-all duration-300 ease-in-out h-screen",
        "bg-card border-border",
        collapsed ? "w-[68px]" : "w-60"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border h-14">
          {!collapsed && (
            <div className="flex items-center space-x-2.5 pl-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Satellite className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-sm tracking-wide">SDB Tool</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {/* Dashboard */}
          {renderNavItem(filteredNavigation[0])}

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-border" />

          {/* Equipment Group */}
          {collapsed ? (
            <div className="space-y-0.5">
              {equipmentItems.map((item) => (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          "justify-center p-3 mx-1"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg z-50">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setEquipmentOpen(!equipmentOpen)}
                className={cn(
                  "w-[calc(100%-16px)] flex items-center justify-between rounded-lg px-3 py-2 mx-2 text-xs font-semibold uppercase tracking-wider",
                  "text-muted-foreground/60 hover:text-muted-foreground",
                  "transition-all duration-200"
                )}
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  Equipment
                </span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                  equipmentOpen && "rotate-180"
                )} />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  equipmentOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="space-y-0.5 pt-0.5">
                  {equipmentItems.map((item) => (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            cn(
                              "group flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              "px-3 py-2 mx-2 ml-4"
                            )
                          }
                        >
                          <item.icon className="h-[18px] w-[18px] mr-3 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </NavLink>
                      </TooltipTrigger>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-border" />

          {/* Rest of navigation */}
          <div className="space-y-0.5">
            {filteredNavigation.slice(1).map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">SDB v2.0</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
