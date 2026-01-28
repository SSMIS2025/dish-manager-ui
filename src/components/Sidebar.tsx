import { NavLink } from "react-router-dom";
import { 
  Satellite, 
  Radio, 
  Settings, 
  Zap, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Activity,
  FolderOpen,
  RotateCcw,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: false },
  { name: "LNB Management", href: "/lnb", icon: Radio, adminOnly: false },
  { name: "Switch Management", href: "/switch", icon: Zap, adminOnly: false },
  { name: "Motor Management", href: "/motor", icon: RotateCcw, adminOnly: false },
  { name: "Unicable Management", href: "/unicable", icon: Activity, adminOnly: false },
  { name: "Satellite", href: "/satellite", icon: Satellite, adminOnly: true },
  { name: "Project Mapping", href: "/project-mapping", icon: FolderOpen, adminOnly: false },
  { name: "User Activity", href: "/admin/activity", icon: Settings, adminOnly: true },
];

const Sidebar = ({ collapsed, onToggle, isAdmin }: SidebarProps) => {
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin);

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
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {filteredNavigation.map((item, index) => (
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
          ))}
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