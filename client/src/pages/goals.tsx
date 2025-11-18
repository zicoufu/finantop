import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Plus, Target, Edit, Trash2, TrendingUp } from "lucide-react";
import GoalForm from "@/components/forms/goal-form";
import { useToast } from "@/hooks/use-toast";
import type { Goal } from "../../../shared/schema"; // Importar o tipo Goal compartilhado
import i18n from "@/i18n";
import GoalSimulator from "@/components/goals/goal-simulator";

export default function Goals() {
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { toast } = useToast();

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api('/api/goals'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      return api(`/api/goals/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('goals.deleteSuccess.title'),
        description: t('goals.deleteSuccess.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('goals.deleteError'),
        variant: "destructive",
      });
    },
  });

  const addFundsMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const goal = goals?.find(g => g.id === id);
      if (!goal) throw new Error(t('goals.notFound'));
      
      const newAmount = parseFloat(goal.currentAmount) + amount;
      return api(`/api/goals/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ currentAmount: newAmount.toString() })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('goals.addValueSuccess.title'),
        description: t('goals.addValueSuccess.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('goals.addValueError'),
        variant: "destructive",
      });
    },
  });

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

  const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const formatYearMonth = (date: Date) => {
    return date.toLocaleDateString(i18n.language || 'pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDuration = (monthsTotal: number) => {
    const years = Math.floor(monthsTotal / 12);
    const months = monthsTotal % 12;
    const yLabel = years === 1 ? t('goals.yearSingular', { defaultValue: 'ano' }) : t('goals.yearPlural', { defaultValue: 'anos' });
    const mLabel = months === 1 ? t('goals.monthSingular', { defaultValue: 'mês' }) : t('goals.monthPlural', { defaultValue: 'meses' });
    if (years === 0) return `${months} ${mLabel}`;
    if (months === 0) return `${years} ${yLabel}`;
    return `${years} ${yLabel} e ${months} ${mLabel}`;
  };

  const calculateTimeToGoal = (goal: Goal, contributionAtStart: boolean = false): { text: string; eta: Date | null; monthsNeeded: number | null } => {
    const P = parseFloat(goal.currentAmount || '0'); // principal atual
    const T = parseFloat(goal.targetAmount || '0');  // valor alvo
    const C = parseFloat(goal.monthlyContribution || '0'); // aporte mensal
    const annual = parseFloat(goal.annualInterestRate || '0'); // taxa % a.a.
    const r = (annual / 100) / 12; // taxa mensal

    const remaining = T - P;
    if (remaining <= 0) return { text: t('goals.achieved'), eta: new Date(), monthsNeeded: 0 };

    let monthsNeeded: number | null = null;

    if (r > 0) {
      // Resolver P*(1+r)^n + C*(((1+r)^n - 1)/r) >= T
      // Se aporte no início do mês, a série de pagamentos tem um fator a mais de (1+r): C*(1+r)*(((1+r)^n - 1)/r)
      // Equivalentemente, substitui C por C*(1+r) na fórmula do fim do mês.
      const Ceff = contributionAtStart ? C * (1 + r) : C;
      // Seja X=(1+r)^n => X*(P + Ceff/r) - Ceff/r >= T => X >= (T + Ceff/r) / (P + Ceff/r)
      const denom = P + (Ceff / r);
      const numer = T + (Ceff / r);
      if (denom > 0 && numer > 0) {
        const X = numer / denom;
        if (X <= 1) {
          monthsNeeded = 0;
        } else {
          monthsNeeded = Math.ceil(Math.log(X) / Math.log(1 + r));
        }
      } else if (P > 0) {
        // Fallback: apenas crescimento do principal
        monthsNeeded = Math.ceil(Math.log(T / P) / Math.log(1 + r));
      }
    } else {
      // Sem juros: T <= P + C*n  => n >= (T-P)/C
      const Ceff = contributionAtStart ? C : C; // sem juros não muda
      if (Ceff > 0) {
        monthsNeeded = Math.ceil(remaining / Ceff);
      }
    }

    // Se não foi possível calcular (ex.: C<=0 e P==0 com r==0), retornar mensagem localizada
    if (monthsNeeded === null || !isFinite(monthsNeeded) || monthsNeeded < 0) {
      return { text: t('goals.noEstimate'), eta: null, monthsNeeded: null };
    }

    // Mantemos um texto genérico interno, mas o UI usará apenas a duração.
    const text = '';

    // ETA date: add monthsNeeded to current month, then choose day
    const base = addMonths(new Date(), monthsNeeded);
    const eta = new Date(base);
    if (contributionAtStart) {
      eta.setDate(1);
    } else {
      // last day of month
      eta.setMonth(eta.getMonth() + 1, 0);
    }
    return { text, eta, monthsNeeded };
  };

  const handleDelete = (id: number) => {
    if (confirm(t('goals.deleteConfirm'))) {
      deleteGoalMutation.mutate(id);
    }
  };

  const handleAddFunds = (goalId: number) => {
    const amount = prompt(t('goals.enterAmount'));
    if (amount && !isNaN(parseFloat(amount))) {
      addFundsMutation.mutate({ id: goalId, amount: parseFloat(amount) });
    }
  };

  const totalGoalsValue = goals ? 
    goals.reduce((sum, goal) => sum + parseFloat(goal.targetAmount), 0) : 0;
  
  const totalSaved = goals ? 
    goals.reduce((sum, goal) => sum + parseFloat(goal.currentAmount), 0) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{t('goals.title')}</h2>
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <div className="p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('goals.financialGoals')}</h2>
            <div className="flex space-x-6 mt-2">
              <span className="text-sm text-gray-600">
                {t('goals.totalGoals')}: <span className="font-semibold text-blue-600">{formatCurrency(totalGoalsValue)}</span>
              </span>
              <span className="text-sm text-gray-600">
                {t('goals.totalSaved')}: <span className="font-semibold text-green-600">{formatCurrency(totalSaved)}</span>
              </span>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('goals.newGoal')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('goals.newGoal')}</DialogTitle>
              </DialogHeader>
              <GoalForm
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSubmitSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["goals"] });
                  queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Goal Simulator */}
        <div className="mb-6">
          <GoalSimulator />
        </div>
        {!goals || goals.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('goals.noGoals')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('goals.startAddingGoals')}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('goals.createGoal')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const progressColor = getProgressColor(progress);
              const isCompleted = progress >= 100;
              
              return (
                <Card key={goal.id} className={`${isCompleted ? 'ring-2 ring-green-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        {goal.name}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingGoal(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(goal.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {t('goals.progress')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="w-full h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('goals.saved')}:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(parseFloat(goal.currentAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('goals.target')}:</span>
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(goal.targetAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('goals.remaining')}:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(Math.max(0, parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)))}
                        </span>
                      </div>
                      {goal.targetDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('goals.targetDate')}:</span>
                          <span className="font-semibold">
                            {formatDate(goal.targetDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-3">
                        {(() => {
                          // Usamos cenário padrão (fim do mês) para uma única estimativa simples
                          const res = calculateTimeToGoal(goal, false);
                          if (res.monthsNeeded === null) {
                            return (
                              <p>
                                <TrendingUp className="h-3 w-3 inline mr-1" />
                                {t('goals.noEstimate')}
                              </p>
                            );
                          }
                          const duration = formatDuration(res.monthsNeeded);
                          const dateLabel = res.eta ? formatYearMonth(res.eta) : '';
                          return (
                            <p>
                              <TrendingUp className="h-3 w-3 inline mr-1" />
                              {t('goals.singleEstimateWithDate', { duration, date: dateLabel })}
                            </p>
                          );
                        })()}
                      </div>
                      
                      {!isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleAddFunds(goal.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('goals.addValue')}
                        </Button>
                      )}
                      
                      {isCompleted && (
                        <div className="text-center">
                          <p className="text-green-600 font-semibold text-sm">
                            {t('goals.achieved')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingGoal && (
        <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('goals.editGoal')}</DialogTitle>
            </DialogHeader>
            <GoalForm
              isOpen={!!editingGoal}
              onClose={() => setEditingGoal(null)}
              initialData={editingGoal!}
              onSubmitSuccess={() => {
                setEditingGoal(null);
                queryClient.invalidateQueries({ queryKey: ["goals"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
