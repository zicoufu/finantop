import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
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
  ChevronLeft,
  LogOut,
  Settings
} from "lucide-react";

const getNavigation = (t: any) => [
  { name: t('sidebar.dashboard'), href: "/dashboard", icon: LayoutDashboard },
  { name: t('sidebar.expenses'), href: "/expenses", icon: CreditCard },
  { name: t('sidebar.income'), href: "/income", icon: Coins },
  { name: t('sidebar.accounts') || 'Contas', href: "/accounts", icon: CreditCard },
  { name: t('sidebar.investments'), href: "/investments", icon: TrendingUp },
  { name: t('sidebar.goals'), href: "/goals", icon: Target },
  { name: t('sidebar.alerts'), href: "/alerts", icon: Bell },
  { name: t('sidebar.reports'), href: "/reports", icon: FileText },
  { name: t('sidebar.preferences'), href: "/preferences", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        "bg-[#050509] text-gray-200 border-r border-[#262626] transition-all duration-300 ease-in-out flex flex-col h-screen overflow-y-auto",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.7)]">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">{t('app.title')}</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 text-gray-300 hover:bg-[#111827] hover:text-white"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-4 pb-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {getNavigation(t).map((item: { name: string; href: string; icon: React.ElementType }) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link to={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm font-medium",
                      isCollapsed ? "px-2" : "px-4",
                      isActive
                        ? "bg-[#111827] text-white border border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                        : "text-gray-300 hover:bg-[#111827] hover:text-white"
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="max-w-[140px]">
                  <p className="font-medium text-gray-800 dark:text-white text-xs break-words">{user?.name || t('common.user')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300 break-words">{user?.email}</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start mt-2 dark:text-gray-100 dark:hover:bg-gray-800" onClick={logout}>
                <LogOut className="h-5 w-5 mr-3 dark:text-white" />
                <span>{t('auth.logout')}</span>
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
