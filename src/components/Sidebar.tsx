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
  FileText
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const renderNavItem = (item: typeof navigation[0], index: number) => (
    <Tooltip key={item.name}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) =>
            cn(
              "group flex items-center rounded-lg text-sm font-medium transition-all duration-300",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "border border-transparent",
              isActive
                ? "bg-primary text-primary-foreground shadow-md border-primary/50"
                : "text-sidebar-foreground/80",
              collapsed ? "justify-center p-3" : "px-4 py-3",
              "animate-fade-in"
            )
          }
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <item.icon className={cn(
            "transition-all duration-300 shrink-0",
            collapsed ? "h-6 w-6" : "h-5 w-5 mr-3"
          )} />
          {!collapsed && (
            <span className="truncate">{item.name}</span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="bg-popover text-popover-foreground border z-50">
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-500 ease-in-out h-screen",
        collapsed ? "w-[68px]" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-16">
          {!collapsed && (
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
                <Satellite className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sidebar-foreground text-lg">SDB Tool</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          {renderNavItem(filteredNavigation[0], 0)}

          {/* Global Equipment Group */}
          {collapsed ? (
            // Collapsed: show equipment items as individual icons
            <div className="space-y-1 mt-1">
              {equipmentItems.map((item, index) => (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "border border-transparent",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md border-primary/50"
                            : "text-sidebar-foreground/80",
                          "justify-center p-3",
                          "animate-fade-in"
                        )
                      }
                      style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                      <item.icon className="h-6 w-6 shrink-0 transition-all duration-300" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border z-50">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            // Expanded: show collapsible group
            <Collapsible open={equipmentOpen} onOpenChange={setEquipmentOpen} className="mt-1">
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                    "transition-all duration-300"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Global Equipment
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    equipmentOpen && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-2 mt-1">
                {equipmentItems.map((item, index) => (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "border border-transparent",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md border-primary/50"
                              : "text-sidebar-foreground/80",
                            "px-4 py-2.5",
                            "animate-fade-in"
                          )
                        }
                        style={{ animationDelay: `${(index + 1) * 50}ms` }}
                      >
                        <item.icon className="h-5 w-5 mr-3 shrink-0 transition-all duration-300" />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    </TooltipTrigger>
                  </Tooltip>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Rest of navigation */}
          <div className="space-y-1 mt-1">
            {filteredNavigation.slice(1).map((item, index) => renderNavItem(item, index + 5))}
          </div>
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/50 text-center">
              SDB Management v2.0
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
