import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ExpenseForm from "@/components/forms/expense-form";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import { Category, Transaction } from "@/lib/types";
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

  // Tarefas de hoje / visão rápida da semana
  const today = new Date();
  const endIso = today.toISOString().split("T")[0];
  const startForWeek = new Date(today);
  startForWeek.setDate(startForWeek.getDate() - 6);
  const startIso = startForWeek.toISOString().split("T")[0];

  const { data: upcomingTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions", "upcoming", 7],
    queryFn: () => api("/api/transactions?upcoming=7"),
  });

  const { data: lastWeekTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions", "last-week", startIso, endIso],
    queryFn: () => api(`/api/transactions?startDate=${startIso}&endDate=${endIso}`),
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

  const {
    data: reportsSummary,
    isLoading: isReportsLoading,
    isError: isReportsError,
  } = useQuery<{ hasData: boolean; expensesByCategory: { name: string; value: number; color: string }[]; balanceEvolution: unknown[] } | undefined>({
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

          {/* Tarefas de hoje / visão rápida */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tarefas de hoje</h2>
                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                  + Registrar despesa de hoje
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
                <div>
                  <h3 className="font-semibold mb-2">Contas a vencer nos próximos 7 dias</h3>
                  {upcomingTransactions.filter(tx => tx.type === "expense").length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma conta a vencer nos próximos 7 dias.</p>
                  ) : (
                    <ul className="space-y-2">
                      {upcomingTransactions
                        .filter(tx => tx.type === "expense")
                        .slice(0, 5)
                        .map((tx) => {
                          const amount = parseFloat(tx.amount || "0");
                          const rawDate = tx.dueDate || tx.date;
                          const dateLabel = rawDate
                            ? new Date(rawDate).toLocaleDateString("pt-BR")
                            : "";
                          return (
                            <li key={tx.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{tx.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Vencimento: {dateLabel}</p>
                              </div>
                              <span className="font-semibold">R$ {amount.toFixed(2)}</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Resumo da última semana</h3>
                  {lastWeekTransactions.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">Nenhum lançamento nos últimos 7 dias.</p>
                  ) : (
                    (() => {
                      const income = lastWeekTransactions
                        .filter(tx => tx.type === "income")
                        .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);
                      const expenses = lastWeekTransactions
                        .filter(tx => tx.type === "expense")
                        .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);
                      return (
                        <div className="space-y-1">
                          <p>Você recebeu <span className="font-semibold text-green-600">R$ {income.toFixed(2)}</span>.</p>
                          <p>Você gastou <span className="font-semibold text-red-600">R$ {expenses.toFixed(2)}</span>.</p>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>

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
            <CategoryKPIsGrid
              items={reportsSummary?.expensesByCategory ?? []}
              isLoading={isReportsLoading}
              isError={isReportsError}
            />
          </div>

          {/* Keep existing recent transactions list below */}
          <RecentTransactions filters={filters} />
        </div>
      </main>
    </div>
  );
}

