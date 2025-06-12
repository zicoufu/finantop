import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { Wallet, TrendingUp, TrendingDown, LineChart, ArrowUp, ArrowDown } from "lucide-react";

interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalInvestments: number;
  goalsCount: number;
  transactionsCount: number;
}

export default function KPICards() {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
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
    return <div>Erro ao carregar dados do dashboard</div>;
  }

  const cards = [
    {
      title: "Saldo Atual",
      value: summary.currentBalance,
      change: "+12% vs mês anterior",
      changeType: "positive" as const,
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: "Receitas do Mês",
      value: summary.monthlyIncome,
      change: "+5% vs mês anterior",
      changeType: "positive" as const,
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: "Despesas do Mês",
      value: summary.monthlyExpenses,
      change: "+8% vs mês anterior",
      changeType: "negative" as const,
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      title: "Investimentos",
      value: summary.totalInvestments,
      change: "+18% vs mês anterior",
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
