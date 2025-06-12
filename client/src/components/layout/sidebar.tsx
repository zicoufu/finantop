import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  CreditCard, 
  Coins, 
  TrendingUp, 
  Target, 
  Bell, 
  FileText, 
  Menu,
  User,
  ChevronLeft
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Despesas", href: "/expenses", icon: CreditCard },
  { name: "Receitas", href: "/income", icon: Coins },
  { name: "Investimentos", href: "/investments", icon: TrendingUp },
  { name: "Metas", href: "/goals", icon: Target },
  { name: "Alertas", href: "/alerts", icon: Bell },
  { name: "Relatórios", href: "/reports", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">FinanceApp</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-4 pb-4 flex-1">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isCollapsed ? "px-2" : "px-4",
                      isActive 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      {!isCollapsed && (
        <>
          <Separator />
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">João Silva</p>
                  <p className="text-sm text-gray-500">Premium</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
