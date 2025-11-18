import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Plus, TrendingUp, Calculator, DollarSign, Calendar, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { handleApiFormError } from "@/lib/formError";

interface Investment {
  id: number;
  name: string;
  type: string;
  amount: string;
  interestRate: string;
  startDate: string;
  maturityDate?: string;
}

interface SimulationResult {
  year: number;
  amount: number;
  totalContributed: number;
  totalReturn: number;
}

const investmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  amount: z.string().min(1, "Amount is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  startDate: z.string().min(1, "Start date is required"),
  maturityDate: z.string().optional(),
});

const simulationSchema = z.object({
  amount: z.string().min(1, "Initial amount is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  years: z.string().min(1, "Period is required"),
  monthlyContribution: z.string().optional(),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;
type SimulationFormData = z.infer<typeof simulationSchema>;

export default function Investments() {
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["investments"],
    queryFn: () => api('/api/investments'),
  });

  const investmentForm = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: "",
      type: "",
      amount: "",
      interestRate: "",
      startDate: new Date().toISOString().split('T')[0],
      maturityDate: "",
    },
  });

  const simulationForm = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      amount: "",
      interestRate: "",
      years: "",
      monthlyContribution: "0",
    },
  });

  const editInvestmentForm = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    // Default values são preenchidos dinamicamente ao abrir o modal de edição
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InvestmentFormData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        interestRate: parseFloat(data.interestRate).toString(),
        maturityDate: data.maturityDate || null,
      };
      return api('/api/investments', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setIsCreateOpen(false);
      investmentForm.reset();
      toast({
        title: t('investments.createSuccess.title'),
        description: t('investments.createSuccess.description'),
      });
    },
    onError: (error) => {
      const msg = handleApiFormError<InvestmentFormData>(error, investmentForm.setError, t, { defaultMessageKey: 'investments.createError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const simulateInvestmentMutation = useMutation({
    mutationFn: async (data: SimulationFormData) => {
      const payload = {
        amount: parseFloat(data.amount),
        interestRate: parseFloat(data.interestRate),
        years: parseInt(data.years),
        monthlyContribution: parseFloat(data.monthlyContribution || "0"),
      };
      return api('/api/investments/simulate', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (response) => {
      setSimulationResults(response);
      toast({
        title: t('investments.simulationSuccess.title'),
        description: t('investments.simulationSuccess.description'),
      });
    },
    onError: (error) => {
      const msg = handleApiFormError<SimulationFormData>(error, simulationForm.setError, t, { defaultMessageKey: 'investments.simulationError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return api(`/api/investments/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('common.success'),
        description: t('investments.deleteSuccess'),
      });
    },
    onError: (error) => {
      console.error("Error deleting investment:", error);
      toast({
        title: t('common.error'),
        description: t('investments.deleteError'),
        variant: "destructive",
      });
    },
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: async (data: InvestmentFormData) => {
      if (!editingInvestment) throw new Error("No investment selected for editing");
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        interestRate: parseFloat(data.interestRate).toString(),
        maturityDate: data.maturityDate || null,
      };
      return api(`/api/investments/${editingInvestment.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setIsEditDialogOpen(false);
      setEditingInvestment(null);
      editInvestmentForm.reset();
      toast({
        title: t('investments.updateSuccess.title'),
        description: t('investments.updateSuccess.description'),
      });
    },
    onError: (error) => {
      const msg = handleApiFormError<InvestmentFormData>(error, editInvestmentForm.setError, t, { defaultMessageKey: 'investments.updateError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const getInvestmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'cdb': 'CDB',
      'lci_lca': 'LCI/LCA',
      'tesouro_direto': 'Tesouro Direto',
      'funds': 'Fundos',
    };
    return types[type] || type;
  };

  const getInvestmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'cdb': 'bg-blue-100 text-blue-800',
      'lci_lca': 'bg-green-100 text-green-800',
      'tesouro_direto': 'bg-purple-100 text-purple-800',
      'funds': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const totalInvestments = investments ? 
    investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0) : 0;

  const onCreateSubmit = (data: InvestmentFormData) => {
    createInvestmentMutation.mutate(data);
  };

  const onEditSubmit = (data: InvestmentFormData) => {
    updateInvestmentMutation.mutate(data);
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    editInvestmentForm.reset({
      name: investment.name,
      type: investment.type,
      amount: investment.amount.toString(), 
      interestRate: investment.interestRate.toString(), 
      startDate: investment.startDate ? new Date(investment.startDate).toISOString().split('T')[0] : '',
      maturityDate: investment.maturityDate ? new Date(investment.maturityDate).toISOString().split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('investments.confirmDelete'))) {
      console.log("Deleting investment:", id);
      deleteInvestmentMutation.mutate(id);
    }
  };

  const onSimulateSubmit = (data: SimulationFormData) => {
    simulateInvestmentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{t('investments.title')}</h2>
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <div className="p-6 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('investments.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('investments.totalInvested')}: <span className="font-semibold text-blue-600">{formatCurrency(totalInvestments)}</span>
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('investments.newInvestment')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('investments.newInvestment')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={investmentForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('investments.name')}</Label>
                  <Input
                    id="name"
                    {...investmentForm.register("name")}
                    placeholder={t('investments.namePlaceholder')}
                  />
                  {investmentForm.formState.errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {investmentForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">{t('investments.type')}</Label>
                  <Select value={investmentForm.watch("type")} onValueChange={(value) => investmentForm.setValue("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investments.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdb">{t('investments.types.cdb')}</SelectItem>
                      <SelectItem value="lci_lca">{t('investments.types.lciLca')}</SelectItem>
                      <SelectItem value="tesouro_direto">{t('investments.types.tesouroDireto')}</SelectItem>
                      <SelectItem value="funds">{t('investments.types.funds')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {investmentForm.formState.errors.type && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {investmentForm.formState.errors.type.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="amount">{t('investments.amount')}</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...investmentForm.register("amount")}
                    placeholder="0,00"
                  />
                  {investmentForm.formState.errors.amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {investmentForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interestRate">{t('investments.interestRate')} (% a.a.)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    {...investmentForm.register("interestRate")}
                    placeholder="10.5"
                  />
                  {investmentForm.formState.errors.interestRate && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {investmentForm.formState.errors.interestRate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="startDate">{t('investments.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...investmentForm.register("startDate")}
                  />
                  {investmentForm.formState.errors.startDate && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {investmentForm.formState.errors.startDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="maturityDate">{t('investments.maturityDate')} ({t('common.optional')})</Label>
                  <Input
                    id="maturityDate"
                    type="date"
                    {...investmentForm.register("maturityDate")}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="submit" disabled={createInvestmentMutation.isPending}>
                    {createInvestmentMutation.isPending ? t('common.creating') : t('investments.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Investment Dialog */}
          {editingInvestment && (
            <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
              setIsEditDialogOpen(isOpen);
              if (!isOpen) setEditingInvestment(null);
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('investments.editInvestment')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={editInvestmentForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">{t('investments.name')}</Label>
                    <Input
                      id="edit-name"
                      {...editInvestmentForm.register("name")}
                      placeholder={t('investments.namePlaceholder')}
                    />
                    {editInvestmentForm.formState.errors.name && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {editInvestmentForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-type">{t('investments.type')}</Label>
                    <Select value={editInvestmentForm.watch("type")} onValueChange={(value) => editInvestmentForm.setValue("type", value)}>
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder={t('investments.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cdb">CDB</SelectItem>
                        <SelectItem value="lci_lca">LCI/LCA</SelectItem>
                        <SelectItem value="tesouro_direto">Tesouro Direto</SelectItem>
                        <SelectItem value="funds">Fundos</SelectItem>
                      </SelectContent>
                    </Select>
                    {editInvestmentForm.formState.errors.type && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {editInvestmentForm.formState.errors.type.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-amount">{t('investments.amount')}</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      {...editInvestmentForm.register("amount")}
                      placeholder="0,00"
                    />
                    {editInvestmentForm.formState.errors.amount && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {editInvestmentForm.formState.errors.amount.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-interestRate">{t('investments.interestRate')} (% a.a.)</Label>
                    <Input
                      id="edit-interestRate"
                      type="number"
                      step="0.01"
                      {...editInvestmentForm.register("interestRate")}
                      placeholder="10.5"
                    />
                    {editInvestmentForm.formState.errors.interestRate && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {editInvestmentForm.formState.errors.interestRate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-startDate">{t('investments.startDate')}</Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      {...editInvestmentForm.register("startDate")}
                    />
                    {editInvestmentForm.formState.errors.startDate && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {editInvestmentForm.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-maturityDate">{t('investments.maturityDate')} ({t('common.optional')})</Label>
                    <Input
                      id="edit-maturityDate"
                      type="date"
                      {...editInvestmentForm.register("maturityDate")}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingInvestment(null);
                    }}>{t('common.cancel')}</Button>
                    <Button type="submit" disabled={updateInvestmentMutation.isPending}>
                      {updateInvestmentMutation.isPending ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList>
            <TabsTrigger value="portfolio">{t('investments.portfolio')}</TabsTrigger>
            <TabsTrigger value="simulator">{t('investments.simulator')}</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  {t('investments.myInvestments')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!investments || investments.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('investments.noInvestments')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {t('investments.startAddingInvestments')}
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('investments.addInvestment')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {investments.map((investment) => (
                      <div key={investment.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-primary">{investment.name}</h3>
                            <Badge className={`${getInvestmentTypeColor(investment.type)} px-2 py-0.5 text-xs font-medium rounded-full`}>
                              {getInvestmentTypeLabel(investment.type)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{t('investments.amount')}: {formatCurrency(parseFloat(investment.amount))}</span>
                            </div>
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{t('investments.interestRate')}: {parseFloat(investment.interestRate).toFixed(2)}% a.a.</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{t('investments.startDate')}: {formatDate(investment.startDate)}</span>
                            </div>
                            {investment.maturityDate && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{t('investments.maturityDate')}: {formatDate(investment.maturityDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Botões de Ação */}
                        <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600" onClick={() => handleEdit(investment)} aria-label={t('investments.editInvestment')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(investment.id)} className="text-red-500 hover:text-red-600" aria-label={t('common.delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    {t('investments.simulator')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={simulationForm.handleSubmit(onSimulateSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="sim-amount">{t('investments.initialAmount')}</Label>
                      <Input
                        id="sim-amount"
                        type="number"
                        step="0.01"
                        {...simulationForm.register("amount")}
                        placeholder="1000"
                      />
                      {simulationForm.formState.errors.amount && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {simulationForm.formState.errors.amount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-rate">{t('investments.interestRate')} (% a.a.)</Label>
                      <Input
                        id="sim-rate"
                        type="number"
                        step="0.01"
                        {...simulationForm.register("interestRate")}
                        placeholder="10.5"
                      />
                      {simulationForm.formState.errors.interestRate && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {simulationForm.formState.errors.interestRate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-years">{t('investments.years')}</Label>
                      <Input
                        id="sim-years"
                        type="number"
                        {...simulationForm.register("years")}
                        placeholder="5"
                      />
                      {simulationForm.formState.errors.years && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {simulationForm.formState.errors.years.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-monthly">{t('investments.monthlyContribution')} ({t('common.optional')})</Label>
                      <Input
                        id="sim-monthly"
                        type="number"
                        step="0.01"
                        {...simulationForm.register("monthlyContribution")}
                        placeholder="0"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={simulateInvestmentMutation.isPending}
                    >
                      {simulateInvestmentMutation.isPending ? t('investments.calculating') : t('investments.calculate')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {simulationResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('investments.result')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {simulationResults.map((result) => (
                        <div key={result.year} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <p className="font-medium">{t('investments.year')} {result.year}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {t('investments.totalInterest')}: {formatCurrency(result.totalReturn)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              {formatCurrency(result.amount)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {t('investments.totalInvested')}: {formatCurrency(result.totalContributed)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
