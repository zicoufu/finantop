import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Plus, Target, Edit, Trash2, TrendingUp } from "lucide-react";
import GoalForm from "@/components/forms/goal-form";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string;
  description?: string;
}

export default function Goals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { toast } = useToast();

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Meta excluída",
        description: "A meta foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a meta.",
        variant: "destructive",
      });
    },
  });

  const addFundsMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const goal = goals?.find(g => g.id === id);
      if (!goal) throw new Error("Meta não encontrada");
      
      const newAmount = parseFloat(goal.currentAmount) + amount;
      return apiRequest("PUT", `/api/goals/${id}`, { 
        currentAmount: newAmount.toString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Valor adicionado",
        description: "O valor foi adicionado à meta com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o valor à meta.",
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

  const calculateTimeToGoal = (goal: Goal): string => {
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    const remaining = target - current;
    
    if (remaining <= 0) return "Meta atingida!";
    
    // Estimativa simples: se economizar R$ 500/mês
    const monthlyEstimate = 500;
    const monthsNeeded = Math.ceil(remaining / monthlyEstimate);
    
    if (monthsNeeded <= 12) {
      return `~${monthsNeeded} meses (R$ 500/mês)`;
    } else {
      const years = Math.floor(monthsNeeded / 12);
      const months = monthsNeeded % 12;
      return `~${years}a ${months}m (R$ 500/mês)`;
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      deleteGoalMutation.mutate(id);
    }
  };

  const handleAddFunds = (goalId: number) => {
    const amount = prompt('Digite o valor a ser adicionado:');
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
            <h2 className="text-2xl font-bold text-gray-800">Metas Financeiras</h2>
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
            <h2 className="text-2xl font-bold text-gray-800">Metas Financeiras</h2>
            <div className="flex space-x-6 mt-2">
              <span className="text-sm text-gray-600">
                Total das Metas: <span className="font-semibold text-blue-600">{formatCurrency(totalGoalsValue)}</span>
              </span>
              <span className="text-sm text-gray-600">
                Total Economizado: <span className="font-semibold text-green-600">{formatCurrency(totalSaved)}</span>
              </span>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Meta Financeira</DialogTitle>
              </DialogHeader>
              <GoalForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {!goals || goals.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma meta cadastrada
              </h3>
              <p className="text-gray-500 mb-4">
                Comece definindo suas metas financeiras.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Meta
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
                          Progresso
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="w-full h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Economizado:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(parseFloat(goal.currentAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Meta:</span>
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(goal.targetAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Restante:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(Math.max(0, parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)))}
                        </span>
                      </div>
                      {goal.targetDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prazo:</span>
                          <span className="font-semibold">
                            {formatDate(goal.targetDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-3">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        {calculateTimeToGoal(goal)}
                      </p>
                      
                      {!isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleAddFunds(goal.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Valor
                        </Button>
                      )}
                      
                      {isCompleted && (
                        <div className="text-center">
                          <p className="text-green-600 font-semibold text-sm">
                            🎉 Meta Atingida!
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
              <DialogTitle>Editar Meta</DialogTitle>
            </DialogHeader>
            <GoalForm
              initialData={editingGoal}
              onSuccess={() => {
                setEditingGoal(null);
                queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
