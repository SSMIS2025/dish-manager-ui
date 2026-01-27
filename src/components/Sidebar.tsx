import { NavLink } from "react-router-dom";
import { 
  Satellite, 
  Radio, 
  Settings, 
  Zap, 
  Router,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Activity,
  FolderOpen,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-500 ease-in-out transform",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-3 animate-fade-in">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Satellite className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg">SDB Tool</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:bg-accent/20"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 animate-fade-in" />
          ) : (
            <ChevronLeft className="h-5 w-5 animate-fade-in" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        {filteredNavigation.map((item, index) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105",
                "hover:bg-gradient-to-r hover:from-accent/20 hover:to-primary/10 hover:text-accent-foreground hover:shadow-md",
                "border border-transparent hover:border-accent/20",
                isActive
                  ? "bg-gradient-to-r from-primary/15 to-accent/15 text-primary border-primary/30 shadow-lg scale-105"
                  : "text-muted-foreground hover:text-foreground",
                collapsed ? "justify-center" : "justify-start",
                "animate-fade-in"
              )
            }
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <item.icon className={cn(
              "transition-all duration-300 group-hover:scale-110",
              collapsed ? "h-7 w-7" : "h-6 w-6 mr-4"
            )} />
            {!collapsed && (
              <span className="animate-fade-in transition-all duration-300">
                {item.name}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;