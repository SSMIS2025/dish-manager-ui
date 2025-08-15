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
  Activity
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
  { name: "Motor Management", href: "/motor", icon: Settings, adminOnly: false },
  { name: "Unicable Management", href: "/unicable", icon: Router, adminOnly: false },
  { name: "Satellite Management", href: "/satellite", icon: Satellite, adminOnly: true },
  { name: "User Activity", href: "/admin/activity", icon: Activity, adminOnly: true },
];

const Sidebar = ({ collapsed, onToggle, isAdmin }: SidebarProps) => {
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Satellite className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">SDB Tool</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-accent/50 hover:text-accent-foreground",
                isActive
                  ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20"
                  : "text-muted-foreground",
                collapsed ? "justify-center" : "justify-start"
              )
            }
          >
            <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;