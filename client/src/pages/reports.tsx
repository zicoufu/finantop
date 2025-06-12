import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { formatDate, getCurrentMonth, getCurrentMonthRange } from "@/lib/date";
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Target, Calendar } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  type: string;
  status: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  color: string;
  type: string;
}

interface Goal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string;
}

interface Investment {
  id: number;
  name: string;
  type: string;
  amount: string;
  interestRate: string;
  startDate: string;
}

export default function Reports() {
  const [period, setPeriod] = useState("current-month");

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const isLoading = transactionsLoading || categoriesLoading || goalsLoading || investmentsLoading;

  const filterTransactionsByPeriod = (transactions: Transaction[], period: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case "current-month":
        return transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        });
      case "last-month":
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear() === lastMonthYear && date.getMonth() === lastMonth;
        });
      case "last-3-months":
        const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
        return transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
      case "current-year":
        return transactions.filter(t => new Date(t.date).getFullYear() === currentYear);
      default:
        return transactions;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "current-month":
        return "Este Mês";
      case "last-month":
        return "Último Mês";
      case "last-3-months":
        return "Últimos 3 Meses";
      case "current-year":
        return "Este Ano";
      default:
        return "Período";
    }
  };

  const generateExpensesByCategory = (transactions: Transaction[], categories: Category[]) => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const data = expenseCategories.map(category => {
      const categoryTransactions = transactions.filter(t => 
        t.categoryId === category.id && t.type === 'expense' && t.status === 'paid'
      );
      const total = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      return {
        category: category.name,
        amount: total,
        color: category.color,
      };
    }).filter(item => item.amount > 0);

    return {
      labels: data.map(item => item.category),
      datasets: [
        {
          label: 'Despesas por Categoria',
          data: data.map(item => item.amount),
          backgroundColor: data.map(item => item.color),
          borderWidth: 1,
        },
      ],
    };
  };

  const generateMonthlyComparison = (transactions: Transaction[]) => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    
    transactions.forEach(t => {
      if (t.status !== 'paid' && t.status !== 'received') return;
      
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }
      
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        monthlyData[monthKey].income += amount;
      } else {
        monthlyData[monthKey].expense += amount;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: 'numeric' 
        });
      }),
      datasets: [
        {
          label: 'Receitas',
          data: sortedMonths.map(month => monthlyData[month].income),
          backgroundColor: 'hsl(142, 76%, 36%)',
        },
        {
          label: 'Despesas',
          data: sortedMonths.map(month => monthlyData[month].expense),
          backgroundColor: 'hsl(0, 84%, 60%)',
        },
      ],
    };
  };

  const calculateFinancialSummary = (transactions: Transaction[], goals: Goal[], investments: Investment[]) => {
    const filteredTransactions = filterTransactionsByPeriod(transactions, period);
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income' && t.status === 'received')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const balance = totalIncome - totalExpenses;
    
    const totalGoalsValue = goals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
    const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0);
    const goalsProgress = totalGoalsValue > 0 ? (totalSaved / totalGoalsValue) * 100 : 0;
    
    const totalInvestments = investments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    
    return {
      totalIncome,
      totalExpenses,
      balance,
      totalGoalsValue,
      totalSaved,
      goalsProgress,
      totalInvestments,
    };
  };

  const exportToCSV = () => {
    if (!transactions) return;

    const filteredTransactions = filterTransactionsByPeriod(transactions, period);
    const categoryMap = categories ? Object.fromEntries(categories.map(c => [c.id, c.name])) : {};
    
    const csvContent = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status'].join(','),
      ...filteredTransactions.map(t => [
        formatDate(t.date),
        t.description,
        categoryMap[t.categoryId] || 'Outros',
        t.type === 'income' ? 'Receita' : 'Despesa',
        parseFloat(t.amount).toFixed(2),
        t.status
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </header>
        <div className="p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!transactions || !categories || !goals || !investments) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
        </header>
        <div className="p-6 flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Erro ao carregar dados dos relatórios
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const summary = calculateFinancialSummary(transactions, goals, investments);
  const filteredTransactions = filterTransactionsByPeriod(transactions, period);
  const expensesChartData = generateExpensesByCategory(filteredTransactions, categories);
  const monthlyComparisonData = generateMonthlyComparison(transactions);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
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
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="detailed">Detalhado</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Receitas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.totalIncome)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getPeriodLabel(period)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Despesas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.totalExpenses)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getPeriodLabel(period)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo</p>
                      <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.balance)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getPeriodLabel(period)}
                      </p>
                    </div>
                    <DollarSign className={`h-8 w-8 ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Progresso Metas</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {summary.goalsProgress.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(summary.totalSaved)} de {formatCurrency(summary.totalGoalsValue)}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {expensesChartData.labels.length > 0 ? (
                      <Bar data={expensesChartData} options={chartOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Nenhuma despesa no período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Receitas vs Despesas (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar data={monthlyComparisonData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Transações Detalhadas - {getPeriodLabel(period)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma transação encontrada no período selecionado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Descrição</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Categoria</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Valor</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((transaction) => {
                            const category = categories.find(c => c.id === transaction.categoryId);
                            const amount = parseFloat(transaction.amount);
                            const amountFormatted = formatCurrency(amount);
                            const amountWithSign = transaction.type === 'income' ? `+${amountFormatted}` : `-${amountFormatted}`;
                            const amountColor = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';

                            return (
                              <tr key={transaction.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-900">
                                  {transaction.description}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {category?.name || 'Outros'}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                                </td>
                                <td className={`py-3 px-4 text-sm text-right font-semibold ${amountColor}`}>
                                  {amountWithSign}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.status === 'paid' || transaction.status === 'received'
                                      ? 'bg-green-100 text-green-800'
                                      : transaction.status === 'pending'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {transaction.status === 'paid' ? 'Pago' :
                                     transaction.status === 'received' ? 'Recebido' :
                                     transaction.status === 'pending' ? 'Pendente' : 'Vencido'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
