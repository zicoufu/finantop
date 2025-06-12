import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

export default function ExpenseChart() {
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?type=expense"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories?type=expense"],
  });

  const isLoading = transactionsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Gastos por Categoria
          </CardTitle>
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || !categories) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate expenses by category
  const expensesByCategory = categories.map(category => {
    const categoryTransactions = transactions.filter(t => t.categoryId === category.id);
    const total = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return {
      name: category.name,
      value: total,
      color: category.color,
    };
  }).filter(item => item.value > 0);

  const chartData = {
    labels: expensesByCategory.map(item => item.name),
    datasets: [
      {
        data: expensesByCategory.map(item => item.value),
        backgroundColor: expensesByCategory.map(item => item.color),
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            family: 'Inter',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            return `${context.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Gastos por Categoria
        </CardTitle>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {expensesByCategory.length > 0 ? (
            <Doughnut data={chartData} options={options} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Nenhuma despesa encontrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
