import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Menu } from "lucide-react";
import KPICards from "@/components/dashboard/kpi-cards";
import ExpenseChart from "@/components/dashboard/expense-chart";
import BalanceChart from "@/components/dashboard/balance-chart";
import UpcomingBills from "@/components/dashboard/upcoming-bills";
import GoalsProgress from "@/components/dashboard/goals-progress";
import RecentTransactions from "@/components/dashboard/recent-transactions";

export default function Dashboard() {
  const [period, setPeriod] = useState("current-month");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Financeiro</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Este mês</SelectItem>
                <SelectItem value="last-month">Último mês</SelectItem>
                <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                <SelectItem value="current-year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {/* KPI Cards */}
        <KPICards />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseChart />
          <BalanceChart />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UpcomingBills />
          </div>
          <GoalsProgress />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions />
      </div>
    </div>
  );
}
