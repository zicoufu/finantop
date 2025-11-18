import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Category, Transaction } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { CategoryColorDot } from "@/components/ui/category-color-dot";
import "@/components/ui/category-color-dot.css";
import { TranslatedCategorySelect } from "@/components/ui/translated-category-select";
import { formatDateForInput, parseUserDateInput } from "@/lib/date";
import { useEffect, useState } from "react";
import { handleApiFormError } from "@/lib/formError";

// Função para obter as preferências do usuário do localStorage
function getUserPreferences() {
  try {
    const storedPrefs = localStorage.getItem('userPreferences');
    if (storedPrefs) {
      return JSON.parse(storedPrefs);
    }
  } catch (error) {
    console.error('Error reading user preferences:', error);
  }
  return null;
}

// Função para criar um esquema de validação de data baseado nas preferências do usuário
const createDateSchema = (t: (key: string) => string) => {
  const userPrefs = getUserPreferences();
  const currentLanguage = localStorage.getItem('i18nextLng') || 'pt-BR';
  const dateFormat = userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
  
  // Criar regex apropriada baseada no formato de data
  let dateRegex;
  if (dateFormat === 'YYYY-MM-DD') {
    dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  } else {
    // Formato DD/MM/YYYY
    dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  }
  
  return z.string().refine(
    (value) => {
      if (!value) return false;
      return dateRegex.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value); // Aceita tanto o formato do usuário quanto o formato ISO
    },
    { message: t("expenses.validation.dateFormat") }
  );
};

const createExpenseSchema = (t: (key: string) => string) => {
  const dateSchema = createDateSchema(t);
  
  return z.object({
    description: z.string().min(1, t("expenses.validation.descriptionRequired")),
    amount: z.string().min(1, t("expenses.validation.amountRequired")),
    date: dateSchema,
    dueDate: dateSchema.optional().nullable(),
    categoryId: z.string().min(1, t("expenses.validation.categoryRequired")),
    status: z.enum(["pending", "paid", "overdue"]),
    expenseType: z.enum(["fixed", "variable"]),
    isRecurring: z.boolean().optional(),
  });
};

type ExpenseFormData = z.infer<ReturnType<typeof createExpenseSchema>>;

interface ExpenseFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  categories: Category[];
}

export default function ExpenseForm({ initialData, onSuccess, categories }: ExpenseFormProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  // Estado para armazenar o formato de data preferido pelo usuário
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD');
  
  // Carregar preferências do usuário quando o componente montar
  useEffect(() => {
    const userPrefs = getUserPreferences();
    const currentLanguage = i18n.language || 'pt-BR';
    const format = userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
    setDateFormat(format);
    
    // Adicionar listener para o evento de mudança de formato de data
    const handleDateFormatChange = (event: CustomEvent) => {
      if (event.detail && event.detail.format) {
        setDateFormat(event.detail.format);
      }
    };
    
    // Registrar o listener
    window.addEventListener('dateFormatChanged', handleDateFormatChange as EventListener);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('dateFormatChanged', handleDateFormatChange as EventListener);
    };
  }, [i18n.language]);
  
  // Função aprimorada para garantir a tradução correta das categorias
  const getCategoryTranslation = (categoryName: string): string => {
    // Mapeamento direto de nomes em português para chaves de tradução
    const categoryKeyMap: Record<string, string> = {
      "Moradia e Habitação": "housing",
      "Alimentação": "food",
      "Transporte": "transportation",
      "Saúde e Bem-estar": "healthWellness",
      "Educação": "education",
      "Entretenimento": "entertainment",
      "Vestuário e Cuidados Pessoais": "clothing",
      "Serviços Domésticos": "homeServices",
      "Animais de Estimação": "pets",
      "Despesas Financeiras": "financial",
      "Impostos e Taxas": "taxes",
      "Outras Despesas": "other"
    };

    console.log(`Traduzindo categoria: ${categoryName}`);
    const key = categoryKeyMap[categoryName];
    const translated = key ? t(`categories.${key}`) : categoryName;
    console.log(`Resultado da tradução: ${translated}`);
    return translated;
  };
  
  const expenseSchema = createExpenseSchema(t);
  
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || "",
      date: initialData?.date 
            ? new Date(initialData.date).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate 
               ? new Date(initialData.dueDate).toISOString().split('T')[0] 
               : "",
      categoryId: initialData?.categoryId?.toString() || "",
      status: (initialData?.status as any) || "pending",
      expenseType: (initialData as any)?.expenseType || "variable",
      isRecurring: initialData?.isRecurring || false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Converter as datas para o formato ISO antes de enviar para o servidor
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        type: "expense",
        date: parseUserDateInput(data.date),
        dueDate: data.dueDate ? parseUserDateInput(data.dueDate) : null,
        expenseType: data.expenseType,
      };
      return api("/api/transactions", { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast({
        title: t('expenses.created'),
        description: t('expenses.createdSuccess'),
      });
      onSuccess();
    },
    onError: (error) => {
      const msg = handleApiFormError<ExpenseFormData>(error, form.setError, t, { defaultMessageKey: 'expenses.createError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Converter as datas para o formato ISO antes de enviar para o servidor
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        date: parseUserDateInput(data.date),
        dueDate: data.dueDate ? parseUserDateInput(data.dueDate) : null,
        expenseType: data.expenseType,
      };
      return api(`/api/transactions/${initialData!.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast({
        title: t('expenses.updated'),
        description: t('expenses.updatedSuccess'),
      });
      onSuccess();
    },
    onError: (error) => {
      const msg = handleApiFormError<ExpenseFormData>(error, form.setError, t, { defaultMessageKey: 'expenses.updateError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    console.log("Form data for submission:", JSON.stringify(data, null, 2));
    if (initialData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">{t('expenses.description')}</Label>
        <Input
          id="description"
          {...form.register("description")}
          placeholder={t('expenses.descriptionPlaceholder')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">{t('expenses.amount')}</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...form.register("amount")}
          placeholder="0.00"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="categoryId">{t('expenses.category')}</Label>
        <TranslatedCategorySelect 
          value={form.watch("categoryId")} 
          onValueChange={(value) => form.setValue("categoryId", value)} 
          categories={categories} 
          placeholder={t('expenses.selectCategory')} 
        />
        {form.formState.errors.categoryId && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="expenseType">{t('expenses.typeLabel')}</Label>
        <Select value={form.watch("expenseType")} onValueChange={(value) => form.setValue("expenseType", value as "fixed" | "variable")}>
          <SelectTrigger>
            <SelectValue placeholder={t('expenses.selectType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">{t('expenses.types.fixed')}</SelectItem>
            <SelectItem value="variable">{t('expenses.types.variable')}</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.expenseType && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.expenseType.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="date">{t('expenses.date')}</Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
          placeholder={dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY'}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="dueDate">{t('expenses.dueDate')}</Label>
        <Input
          id="dueDate"
          type="date"
          {...form.register("dueDate")}
          placeholder={dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY'}
        />
        {form.formState.errors.dueDate && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.dueDate.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="status">{t('expenses.status')}</Label>
        <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('expenses.statusPending')}</SelectItem>
            <SelectItem value="paid">{t('expenses.statusPaid')}</SelectItem>
            <SelectItem value="overdue">{t('expenses.statusOverdue')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isRecurring"
          checked={form.watch("isRecurring")}
          onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
        />
        <Label htmlFor="isRecurring">{t('expenses.recurring')}</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.saving') : initialData ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
