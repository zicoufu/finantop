import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ExpenseForm from "@/components/forms/expense-form";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import { Category } from "@/lib/types";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import SidebarFilters from "@/components/dashboard/sidebar-filters";
import KPIHero from "@/components/dashboard/kpi-hero";
import { TopIncomeCategories, CategoryKPIsGrid } from "@/components/dashboard/top-sections";
import ExpenseChart from "@/components/dashboard/expense-chart";
import BalanceChart from "@/components/dashboard/balance-chart";

export default function Dashboard() {
  const [period, setPeriod] = useState("current-month");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    year: new Date().getFullYear().toString(),
    month: "all",
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { t } = useTranslation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", "expense"],
    queryFn: () => api("/api/categories?type=expense"),
  });

  const buildReportsQueryUrl = () => {
    const params = new URLSearchParams();

    const parseFilterDateToIso = (value: string) => {
      if (!value) return null;
      const [day, month, year] = value.split("/");
      if (!day || !month || !year) return null;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    };

    const startIso = parseFilterDateToIso(filters.startDate);
    const endIso = parseFilterDateToIso(filters.endDate);

    if (startIso) params.set("startDate", startIso);
    if (endIso) params.set("endDate", endIso);
    if (filters.year) params.set("year", filters.year);
    if (filters.month && filters.month !== "all") params.set("month", filters.month);

    const queryString = params.toString();
    return queryString ? `/api/reports/charts?${queryString}` : "/api/reports/charts";
  };

  const { data: reportsSummary } = useQuery<{ hasData: boolean; expensesByCategory: unknown[]; balanceEvolution: unknown[] } | undefined>({
    queryKey: ["reports", "charts", "summary", filters],
    queryFn: () => api(buildReportsQueryUrl()),
  });

  const getPeriodLabel = () => {
    const { startDate, endDate, year, month } = filters;

    if (startDate && endDate) {
      return `Período: ${startDate} a ${endDate}`;
    }

    if (month && month !== "all" && year) {
      const monthNames: Record<string, string> = {
        "1": "Janeiro",
        "2": "Fevereiro",
        "3": "Março",
        "4": "Abril",
        "5": "Maio",
        "6": "Junho",
        "7": "Julho",
        "8": "Agosto",
        "9": "Setembro",
        "10": "Outubro",
        "11": "Novembro",
        "12": "Dezembro",
      };
      const monthLabel = monthNames[month] ?? month;
      return `Período: ${monthLabel}/${year}`;
    }

    if (year) {
      return `Período: Ano de ${year}`;
    }

    return "Período: Todo o histórico";
  };

  return (
    <div className="flex h-full">
      <SidebarFilters
        filters={filters}
        onFiltersChange={setFilters}
        onResetFilters={() =>
          setFilters({
            startDate: "",
            endDate: "",
            year: new Date().getFullYear().toString(),
            month: "all",
          })
        }
      />
      <main className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h2>
            </div>

            <div className="flex items-center space-x-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">{t('dashboard.periods.currentMonth')}</SelectItem>
                  <SelectItem value="last-month">{t('dashboard.periods.lastMonth')}</SelectItem>
                  <SelectItem value="last-3-months">{t('dashboard.periods.last3Months')}</SelectItem>
                  <SelectItem value="current-year">{t('dashboard.periods.currentYear')}</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('transactions.newTransaction')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('transactions.newExpense')}</DialogTitle>
                    <DialogDescription>{t('transactions.fillExpenseDetails')}</DialogDescription>
                  </DialogHeader>
                  <ExpenseForm
                    onSuccess={() => {
                      setIsCreateOpen(false);
                      // Opcional: invalidar queries para atualizar dados do dashboard
                    }}
                    categories={categories}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="mb-2 text-sm text-gray-500">
            {getPeriodLabel()}
            {reportsSummary && (!reportsSummary.hasData || ((reportsSummary.expensesByCategory?.length ?? 0) === 0 && (reportsSummary.balanceEvolution?.length ?? 0) === 0)) && (
              <span className="italic"> — não houve lançamentos de rendas e despesas.</span>
            )}
          </div>
          {/* Hero KPIs matching visual design */}
          <KPIHero />

          {/* Top sections grid: incomes and expenses categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopIncomeCategories filters={filters} />
            <ExpenseChart filters={filters} />
          </div>

          {/* Evolution monthly combined chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BalanceChart filters={filters} />
          </div>

          {/* Category KPI mini-cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CategoryKPIsGrid />
          </div>

          {/* Keep existing recent transactions list below */}
          <RecentTransactions filters={filters} />
        </div>
      </main>
    </div>
  );
}

