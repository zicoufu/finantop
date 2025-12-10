import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, RotateCcw } from "lucide-react";
import ExpenseForm from "@/components/forms/expense-form";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import { Category, Transaction } from "@/lib/types";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import SidebarFilters from "@/components/dashboard/sidebar-filters";
import KPIHero from "@/components/dashboard/kpi-hero";
import { TopIncomeCategories, CategoryKPIsGrid } from "@/components/dashboard/top-sections";
import ExpenseChart from "@/components/dashboard/expense-chart";
import BalanceChart from "@/components/dashboard/balance-chart";

export default function Dashboard() {
  const [period, setPeriod] = useState("current-month");
  const queryClient = useQueryClient();
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

  
  // ==========================
  // Tarefas de hoje / visão rápida da semana
  // Agora respeitando os filtros do dashboard (opção B)
  // ==========================

  const parsePtBrDateToDate = (value: string) => {
    if (!value) return null;
    const [day, month, year] = value.split("/");
    if (!day || !month || !year) return null;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  };

  const computeReferenceDate = () => {
    const { startDate, endDate, year, month } = filters;

    const end = parsePtBrDateToDate(endDate);
    if (end) return end;

    const start = parsePtBrDateToDate(startDate);
    if (start) return start;

    if (year && month && month !== "all") {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1;
      // Último dia do mês filtrado
      return new Date(y, m + 1, 0);
    }

    if (year) {
      const y = parseInt(year, 10);
      // Último dia do ano filtrado
      return new Date(y, 11, 31);
    }

    // Fallback: hoje
    return new Date();
  };

  const referenceDate = computeReferenceDate();

  // Últimos 7 dias em relação à data de referência
  const weekEnd = new Date(referenceDate);
  const weekStart = new Date(referenceDate);
  weekStart.setDate(weekStart.getDate() - 6);

  const weekEndIso = weekEnd.toISOString().split("T")[0];
  const weekStartIso = weekStart.toISOString().split("T")[0];

  // Próximos 7 dias em relação à data de referência
  const upcomingStart = new Date(referenceDate);
  const upcomingEnd = new Date(referenceDate);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  const upcomingStartIso = upcomingStart.toISOString().split("T")[0];
  const upcomingEndIso = upcomingEnd.toISOString().split("T")[0];

  const { data: upcomingTransactionsInRange = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions", "upcoming-range", upcomingStartIso, upcomingEndIso],
    queryFn: () => api(`/api/transactions?startDate=${upcomingStartIso}&endDate=${upcomingEndIso}`),
  });

  const { data: lastWeekTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions", "last-week", weekStartIso, weekEndIso],
    queryFn: () => api(`/api/transactions?startDate=${weekStartIso}&endDate=${weekEndIso}`),
  });

  const formatDatePtBr = (d: Date) => d.toLocaleDateString("pt-BR");

  const lastWeekIncome = lastWeekTransactions
    .filter((tx: Transaction) => tx.type === "income")
    .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

  const lastWeekExpenses = lastWeekTransactions
    .filter((tx: Transaction) => tx.type === "expense")
    .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

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
      <main className="flex-1 flex flex-col h-full bg-[#050509]">

        {/* Header */}
        <header className="bg-[#050509] border-b border-[#262626] px-6 pt-2 pb-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Painel Financeiro</h2>
              <p className="text-xs text-gray-400 mt-1">
                Visão geral rápida do seu saldo, entradas e despesas no período selecionado.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40 h-9 text-sm border-[#262626] bg-[#020617] text-gray-200">
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
                  <Button className="h-9 bg-orange-500 hover:bg-orange-500/90 text-sm font-medium px-4 shadow-[0_0_18px_rgba(249,115,22,0.7)]">
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

              <Button
                variant="outline"
                className="h-9 px-4 border-[#374151] bg-transparent text-gray-200 hover:bg-[#111827] hover:text-white flex items-center gap-2"
                onClick={() => queryClient.invalidateQueries()}
              >
                <RotateCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#050509]">
          <div className="mb-2 text-sm text-gray-400">
            {getPeriodLabel()}
            {reportsSummary && (!reportsSummary.hasData || ((reportsSummary.expensesByCategory?.length ?? 0) === 0 && (reportsSummary.balanceEvolution?.length ?? 0) === 0)) && (
              <span className="italic"> — não houve lançamentos de rendas e despesas.</span>
            )}
          </div>
          {/* Hero KPIs matching visual design */}
          <KPIHero />

          {/* Tarefas de hoje / visão rápida */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-dark-surface p-6 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.8)] border border-dark-border lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Tarefas de hoje</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#374151] bg-transparent text-gray-200 hover:bg-[#111827] hover:text-white"
                  onClick={() => setIsCreateOpen(true)}
                >
                  + Registrar despesa de hoje
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
                <div>
                  <h3 className="font-semibold mb-2">
                    Contas entre {formatDatePtBr(upcomingStart)} e {formatDatePtBr(upcomingEnd)}
                  </h3>
                  {upcomingTransactionsInRange.filter((tx: Transaction) => tx.type === "expense").length === 0 ? (
                    <p className="text-gray-500">Nenhuma conta a vencer nos próximos 7 dias.</p>
                  ) : (
                    <ul className="space-y-2">
                      {upcomingTransactionsInRange
                        .filter((tx: Transaction) => tx.type === "expense")
                        .slice(0, 5)
                        .map((tx: Transaction) => {
                          const amount = parseFloat(tx.amount || "0");
                          const rawDate = tx.dueDate || tx.date;
                          const dateLabel = rawDate
                            ? new Date(rawDate).toLocaleDateString("pt-BR")
                            : "";
                          return (
                            <li key={tx.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-100">{tx.description}</p>
                                <p className="text-xs text-gray-500">Vencimento: {dateLabel}</p>
                              </div>
                              <span className="font-semibold">R$ {amount.toFixed(2)}</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    Resumo da semana até {formatDatePtBr(weekEnd)}
                  </h3>
                  {lastWeekTransactions.length === 0 ? (
                    <p className="text-gray-500">Nenhum lançamento nos últimos 7 dias.</p>
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
                          <p className="text-gray-300">Você recebeu <span className="font-semibold text-emerald-400">R$ {income.toFixed(2)}</span>.</p>
                          <p className="text-gray-300">Você gastou <span className="font-semibold text-rose-400">R$ {expenses.toFixed(2)}</span>.</p>
                        </div>
                      );
                    })()
                  )}
                </div>
            </div>
          </div>

          {/* Faixa principal: Fluxo de Caixa ocupando toda a largura */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <BalanceChart filters={filters} />
            </div>
          </div>

          {/* Linha inferior: donut de despesas x resumo da semana (sem widget simples de contas) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2">
              <ExpenseChart filters={filters} />
            </div>
            {/* Resumo da Semana (widget lateral) */}
            <div className="bg-dark-surface p-6 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.8)] border border-dark-border flex-1">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Resumo da Semana</h3>
                {lastWeekTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhum lançamento no intervalo recente.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <div className="mt-1 mr-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      </div>
                      <p className="text-gray-300">
                        Você recebeu
                        {" "}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(lastWeekIncome)}
                        </span>
                        {" "}
                        no período.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="mt-1 mr-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-200">
                        Você gastou
                        {" "}
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {formatCurrency(lastWeekExpenses)}
                        </span>
                        {" "}
                        no período.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

