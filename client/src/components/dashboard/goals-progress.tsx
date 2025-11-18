import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface Goal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  description?: string;
}

export default function GoalsProgress() {
  const { t } = useTranslation();
  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api("/api/goals"),
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            {t('dashboard.goals')}
          </CardTitle>
          <Skeleton className="h-8 w-8" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full mb-1" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goals) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>{t('dashboard.goals')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {t('dashboard.errorLoadingGoals')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateProgress = (current: string, target: string): number => {
    const currentAmount = parseFloat(current);
    const targetAmount = parseFloat(target);
    if (targetAmount === 0) return 0;
    return Math.min((currentAmount / targetAmount) * 100, 100);
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-gray-300";
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          {t('dashboard.goals')}
        </CardTitle>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary/80" title={t('goals.addValue')}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">{t('dashboard.noGoalsDefined')}</p>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.createGoal')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.slice(0, 3).map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const progressColor = getProgressColor(progress);
              
              return (
                <div key={goal.id}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{goal.name}</h4>
                    <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="w-full h-2 mb-1"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{t('goals.saved')}: {formatCurrency(parseFloat(goal.currentAmount))}</span>
                    <span>{t('goals.target')}: {formatCurrency(parseFloat(goal.targetAmount))}</span>
                  </div>
                </div>
              );
            })}
            
            {goals.length > 3 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  {t('dashboard.viewAllGoals')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
