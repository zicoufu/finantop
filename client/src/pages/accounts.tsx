import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

interface Account {
  id: number;
  name: string;
  type: "bank" | "credit_card" | string;
  balance: number;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
}

interface CreateAccountInput {
  name: string;
  type: "bank" | "credit_card";
  balance: string;
  creditLimit: string;
  closingDay: string;
  dueDay: string;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<CreateAccountInput>({
    name: "",
    type: "bank",
    balance: "0",
    creditLimit: "0",
    closingDay: "",
    dueDay: "",
  });

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => api("/api/accounts"),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAccountInput) => {
      const body = {
        name: payload.name,
        type: payload.type,
        balance: Number(payload.balance.replace(",", ".")) || 0,
        creditLimit: Number(payload.creditLimit.replace(",", ".")) || 0,
        closingDay: payload.type === "credit_card" && payload.closingDay ? Number(payload.closingDay) : null,
        dueDay: payload.type === "credit_card" && payload.dueDay ? Number(payload.dueDay) : null,
      };
      return api("/api/accounts", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast({ title: "Conta criada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setForm({ name: "", type: "bank", balance: "0", creditLimit: "0", closingDay: "", dueDay: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar conta",
        description: error?.data?.message || error?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api(`/api/accounts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Conta removida" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover conta",
        description: error?.data?.message || error?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Informe o nome da conta", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta conta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleChange = (field: keyof CreateAccountInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Contas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Cadastrar nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome</label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Nubank, Itaú, Cartão Visa"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Tipo</label>
              <Select
                value={form.type}
                onValueChange={(value) => handleChange("type", value as "bank" | "credit_card")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Conta bancária</SelectItem>
                  <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Saldo inicial</label>
              <Input
                type="text"
                value={form.balance}
                onChange={(e) => handleChange("balance", e.target.value)}
                placeholder="0,00"
              />
            </div>

            {form.type === "credit_card" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Limite</label>
                  <Input
                    type="text"
                    value={form.creditLimit}
                    onChange={(e) => handleChange("creditLimit", e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Dia de fechamento</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.closingDay}
                    onChange={(e) => handleChange("closingDay", e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Dia de vencimento</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dueDay}
                    onChange={(e) => handleChange("dueDay", e.target.value)}
                    placeholder="Ex: 20"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar conta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas contas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando contas...</p>
          ) : !accounts || accounts.length === 0 ? (
            <p>Nenhuma conta cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.type === "credit_card" ? "Cartão de crédito" : "Conta bancária"}</TableCell>
                    <TableCell>{account.balance?.toFixed ? account.balance.toFixed(2) : account.balance}</TableCell>
                    <TableCell>{account.creditLimit ?? "-"}</TableCell>
                    <TableCell>{account.closingDay ?? "-"}</TableCell>
                    <TableCell>{account.dueDay ?? "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
