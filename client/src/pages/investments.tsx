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
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Plus, TrendingUp, Calculator, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório"),
  interestRate: z.string().min(1, "Taxa de juros é obrigatória"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  maturityDate: z.string().optional(),
});

const simulationSchema = z.object({
  amount: z.string().min(1, "Valor inicial é obrigatório"),
  interestRate: z.string().min(1, "Taxa de juros é obrigatória"),
  years: z.string().min(1, "Período é obrigatório"),
  monthlyContribution: z.string().optional(),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;
type SimulationFormData = z.infer<typeof simulationSchema>;

export default function Investments() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
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

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InvestmentFormData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        interestRate: parseFloat(data.interestRate).toString(),
        maturityDate: data.maturityDate || null,
      };
      return apiRequest("POST", "/api/investments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setIsCreateOpen(false);
      investmentForm.reset();
      toast({
        title: "Investimento criado",
        description: "O investimento foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o investimento.",
        variant: "destructive",
      });
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
      return apiRequest("POST", "/api/investments/simulate", payload);
    },
    onSuccess: (response) => {
      response.json().then((data) => {
        setSimulationResults(data);
        toast({
          title: "Simulação realizada",
          description: "A simulação foi calculada com sucesso.",
        });
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível realizar a simulação.",
        variant: "destructive",
      });
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

  const onSimulateSubmit = (data: SimulationFormData) => {
    simulateInvestmentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Investimentos</h2>
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
            <h2 className="text-2xl font-bold text-gray-800">Investimentos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Total Investido: <span className="font-semibold text-blue-600">{formatCurrency(totalInvestments)}</span>
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Investimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Investimento</DialogTitle>
              </DialogHeader>
              <form onSubmit={investmentForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    {...investmentForm.register("name")}
                    placeholder="Ex: CDB Banco XYZ"
                  />
                  {investmentForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {investmentForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={investmentForm.watch("type")} onValueChange={(value) => investmentForm.setValue("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdb">CDB</SelectItem>
                      <SelectItem value="lci_lca">LCI/LCA</SelectItem>
                      <SelectItem value="tesouro_direto">Tesouro Direto</SelectItem>
                      <SelectItem value="funds">Fundos</SelectItem>
                    </SelectContent>
                  </Select>
                  {investmentForm.formState.errors.type && (
                    <p className="text-sm text-red-600 mt-1">
                      {investmentForm.formState.errors.type.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="amount">Valor Investido</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...investmentForm.register("amount")}
                    placeholder="0,00"
                  />
                  {investmentForm.formState.errors.amount && (
                    <p className="text-sm text-red-600 mt-1">
                      {investmentForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interestRate">Taxa de Juros (% a.a.)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    {...investmentForm.register("interestRate")}
                    placeholder="10.5"
                  />
                  {investmentForm.formState.errors.interestRate && (
                    <p className="text-sm text-red-600 mt-1">
                      {investmentForm.formState.errors.interestRate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...investmentForm.register("startDate")}
                  />
                  {investmentForm.formState.errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {investmentForm.formState.errors.startDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="maturityDate">Data de Vencimento (opcional)</Label>
                  <Input
                    id="maturityDate"
                    type="date"
                    {...investmentForm.register("maturityDate")}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="submit" disabled={createInvestmentMutation.isPending}>
                    {createInvestmentMutation.isPending ? "Criando..." : "Criar Investimento"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList>
            <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
            <TabsTrigger value="simulator">Simulador</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Meus Investimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!investments || investments.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum investimento cadastrado
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Comece adicionando seus primeiros investimentos.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Investimento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {investments.map((investment) => (
                      <div key={investment.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">{investment.name}</h3>
                              <Badge className={getInvestmentTypeColor(investment.type)}>
                                {getInvestmentTypeLabel(investment.type)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span>{formatCurrency(parseFloat(investment.amount))}</span>
                              </div>
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                <span>{parseFloat(investment.interestRate).toFixed(2)}% a.a.</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{formatDate(investment.startDate)}</span>
                              </div>
                              {investment.maturityDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>Vence: {formatDate(investment.maturityDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>
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
                    Simulador de Investimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={simulationForm.handleSubmit(onSimulateSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="sim-amount">Valor Inicial</Label>
                      <Input
                        id="sim-amount"
                        type="number"
                        step="0.01"
                        {...simulationForm.register("amount")}
                        placeholder="1000"
                      />
                      {simulationForm.formState.errors.amount && (
                        <p className="text-sm text-red-600 mt-1">
                          {simulationForm.formState.errors.amount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-rate">Taxa de Juros (% a.a.)</Label>
                      <Input
                        id="sim-rate"
                        type="number"
                        step="0.01"
                        {...simulationForm.register("interestRate")}
                        placeholder="10.5"
                      />
                      {simulationForm.formState.errors.interestRate && (
                        <p className="text-sm text-red-600 mt-1">
                          {simulationForm.formState.errors.interestRate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-years">Período (anos)</Label>
                      <Input
                        id="sim-years"
                        type="number"
                        {...simulationForm.register("years")}
                        placeholder="5"
                      />
                      {simulationForm.formState.errors.years && (
                        <p className="text-sm text-red-600 mt-1">
                          {simulationForm.formState.errors.years.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sim-monthly">Aporte Mensal (opcional)</Label>
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
                      {simulateInvestmentMutation.isPending ? "Calculando..." : "Simular"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {simulationResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultado da Simulação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {simulationResults.map((result) => (
                        <div key={result.year} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">Ano {result.year}</p>
                            <p className="text-sm text-gray-600">
                              Rendimento: {formatCurrency(result.totalReturn)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              {formatCurrency(result.amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Investido: {formatCurrency(result.totalContributed)}
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
