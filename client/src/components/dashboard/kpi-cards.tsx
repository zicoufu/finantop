import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@/lib/types";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ExpenseForm from "@/components/forms/expense-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { Wallet, TrendingUp, TrendingDown, LineChart, ArrowUp, ArrowDown, Plus, AlertCircle, Loader2 } from "lucide-react";

interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalInvestments: number;
  goalsCount: number;
  transactionsCount: number;
  hasTransactions?: boolean;
  error?: boolean;
}

export default function KPICards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api("/api/dashboard/summary"),
  });
  
  // Verificar se há dados e exibir aviso se necessário (sem redirecionar)
  useEffect(() => {
    if (summary && summary.hasTransactions === false) {
      toast.info(t('dashboard.noTransactions', 'Sem transações registradas'));
    }
  }, [summary, t]);
  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", "expense"],
    queryFn: () => api("/api/categories?type=expense"),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return <div>{t('dashboard.errorLoading')}</div>;
  }
  
  // If there are no transactions, display informative message
  if (summary.hasTransactions === false) {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noData.title')}</h3>
          <p className="text-gray-500 mb-6">{t('dashboard.noData.description')}</p>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('transactions.addTransaction')}
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
                }}
                categories={categories}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }
  
  // If an error occurred, display error message
  if (summary.error) {
    return (
      <div className="bg-white shadow-sm border border-red-200 rounded-lg p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.error.title')}</h3>
          <p className="text-gray-500">{t('dashboard.error.description')}</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: t('dashboard.currentBalance'),
      value: summary.currentBalance,
      change: "+12% vs " + t('dashboard.previousMonth'),
      changeType: "positive" as const,
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: t('dashboard.monthlyIncome'),
      value: summary.monthlyIncome,
      change: "+5% vs " + t('dashboard.previousMonth'),
      changeType: "positive" as const,
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: t('dashboard.monthlyExpenses'),
      value: summary.monthlyExpenses,
      change: "+8% vs " + t('dashboard.previousMonth'),
      changeType: "negative" as const,
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      title: t('dashboard.totalInvestments'),
      value: summary.totalInvestments,
      change: "+18% vs " + t('dashboard.previousMonth'),
      changeType: "positive" as const,
      icon: LineChart,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const ChangeIcon = card.changeType === "positive" ? ArrowUp : ArrowDown;
        
        return (
          <Card key={card.title} className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(card.value)}
                  </p>
                  <p className={`text-sm mt-1 flex items-center ${
                    card.changeType === "positive" ? "text-green-600" : "text-red-600"
                  }`}>
                    <ChangeIcon className="h-3 w-3 mr-1" />
                    {card.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
