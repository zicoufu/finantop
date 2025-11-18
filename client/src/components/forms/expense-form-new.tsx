import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Category, Transaction } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { CategoryColorDot } from "@/components/ui/category-color-dot";
import "@/components/ui/category-color-dot.css";
import { CategorySelect } from "@/components/ui/category-select";
import { convertToISOFormat, convertFromISOFormat } from "@/lib/date";
import { handleApiFormError } from "@/lib/formError";

// Função auxiliar para criar regex de validação de data com base no formato atual
const createDateRegex = (format: string) => {
  if (format === 'DD/MM/YYYY') {
    return /^\d{2}\/\d{2}\/\d{4}$/;
  } else if (format === 'MM/DD/YYYY') {
    return /^\d{2}\/\d{2}\/\d{4}$/;
  } else {
    // Formato padrão YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/;
  }
};

const createExpenseSchema = (t: (key: string) => string, dateFormat: string) => z.object({
  description: z.string().min(1, t("expenses.validation.descriptionRequired")),
  amount: z.string().min(1, t("expenses.validation.amountRequired")),
  date: z.string().refine(
    (value) => createDateRegex(dateFormat).test(value),
    { message: t("expenses.validation.dateFormat") + ` (${dateFormat})` }
  ),
  dueDate: z.string().refine(
    (value) => !value || createDateRegex(dateFormat).test(value),
    { message: t("expenses.validation.dueDateFormat") + ` (${dateFormat})` }
  ).optional().nullable(),
  categoryId: z.string().min(1, t("expenses.validation.categoryRequired")),
  status: z.enum(["pending", "paid", "overdue"]),
  expenseType: z.enum(["fixed", "variable"]),
  isRecurring: z.boolean().optional(),
  repeatMonths: z.coerce.number().min(0).max(60).optional().default(0),
});

type ExpenseFormData = z.infer<ReturnType<typeof createExpenseSchema>>;

interface ExpenseFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  categories: Category[];
}

export default function ExpenseFormNew({ initialData, onSuccess, categories }: ExpenseFormProps) {
  // Depuração: Mostrar todas as categorias recebidas
  console.log("========== CATEGORIAS RECEBIDAS NO FORMULÁRIO ==========");
  console.log(JSON.stringify(categories, null, 2));
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  // Estado para armazenar o formato de data preferido pelo usuário
  const initialByLang = (lng: string | undefined) => (lng && lng.startsWith('en')) ? 'YYYY-MM-DD' : 'DD/MM/YYYY';
  const [dateFormat, setDateFormat] = useState<string>(initialByLang(typeof window !== 'undefined' ? (window as any).i18next?.language || i18n.language : i18n.language));
  
  // Carregar preferências do usuário quando o componente montar
  useEffect(() => {
    // Obter preferências do usuário do localStorage
    const storedPrefs = localStorage.getItem('userPreferences');
    if (storedPrefs) {
      try {
        const userPrefs = JSON.parse(storedPrefs);
        if (userPrefs.dateFormat) {
          setDateFormat(userPrefs.dateFormat);
        }
      } catch (error) {
        console.error('Erro ao analisar preferências do usuário:', error);
      }
    } else {
      // Sem preferências salvas, usar heurística por idioma
      const byLang = i18n?.language && i18n.language.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY';
      setDateFormat(byLang);
    }
    
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
  }, []);
  
  // Este useEffect foi movido para depois da definição do formulário
  
  // Depuração: Mostrar informações do i18n
  console.log("========== INFORMAÇÕES DO I18N ==========");
  console.log("Idioma atual:", i18n.language);
  console.log("Recursos disponíveis:", i18n.options.resources);
  console.log("Namespace atual:", i18n.options.defaultNS);
  
  console.log("Idioma atual:", i18n.language);
  console.log("Categorias disponíveis:", categories);
  
  // Mapeamento direto de categorias para traduções
  const getCategoryTranslation = (categoryName: string): string => {
    console.log(`Traduzindo categoria: "${categoryName}"`);
    
    // Mapeamento direto de nomes em português para chaves de tradução
    const translationMap: Record<string, string> = {
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
    
    const key = translationMap[categoryName];
    if (!key) {
      console.log(`Nenhuma tradução encontrada para: "${categoryName}"`);
      return categoryName;
    }
    
    const translationKey = `categories.${key}`;
    const translated = t(translationKey);
    console.log(`Chave de tradução: "${translationKey}" => "${translated}"`);
    
    return translated;
  };
  
  // Usar o formato de data atual no esquema de validação
  const expenseSchema = createExpenseSchema(t, dateFormat);
  
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || "",
      date: initialData?.date 
            ? dateFormat === 'YYYY-MM-DD'
              ? new Date(initialData.date).toISOString().split('T')[0]
              : convertFromISOFormat(new Date(initialData.date).toISOString().split('T')[0], dateFormat)
            : dateFormat === 'YYYY-MM-DD'
              ? new Date().toISOString().split('T')[0]
              : convertFromISOFormat(new Date().toISOString().split('T')[0], dateFormat),
      dueDate: initialData?.dueDate 
               ? dateFormat === 'YYYY-MM-DD'
                 ? new Date(initialData.dueDate).toISOString().split('T')[0]
                 : convertFromISOFormat(new Date(initialData.dueDate).toISOString().split('T')[0], dateFormat)
               : "",
      categoryId: initialData?.categoryId?.toString() || "",
      status: (initialData?.status as any) || "pending",
      expenseType: (initialData as any)?.expenseType || "variable",
      isRecurring: initialData?.isRecurring || false,
      repeatMonths: 0,
    },
  });

  // Atualizar o esquema de validação quando o formato de data mudar
  useEffect(() => {
    // Revalidar o formulário com o novo formato de data
    form.trigger();
    // Sincronizar valores atuais dos campos de data para o novo formato
    const currentDate = form.getValues("date");
    const currentDueDate = form.getValues("dueDate");
    try {
      const detectFormat = (val: string): string | null => {
        if (createDateRegex('YYYY-MM-DD').test(val)) return 'YYYY-MM-DD';
        if (createDateRegex('DD/MM/YYYY').test(val)) return 'DD/MM/YYYY';
        if (createDateRegex('MM/DD/YYYY').test(val)) return 'MM/DD/YYYY';
        return null;
      };

      const toTargetFormat = (val: string): string => {
        const fmt = detectFormat(val);
        if (!fmt) return val;
        const iso = fmt === 'YYYY-MM-DD' ? val : convertToISOFormat(val, fmt);
        return dateFormat === 'YYYY-MM-DD'
          ? new Date(iso).toISOString().split('T')[0]
          : convertFromISOFormat(new Date(iso).toISOString().split('T')[0], dateFormat);
      };

      if (currentDate) {
        const newDate = toTargetFormat(currentDate);
        form.setValue('date', newDate, { shouldValidate: true, shouldDirty: true });
      }
      if (currentDueDate) {
        const newDue = toTargetFormat(currentDueDate);
        form.setValue('dueDate', newDue, { shouldValidate: true, shouldDirty: true });
      }
    } catch (e) {
      console.warn('Falha ao sincronizar datas com novo formato:', e);
    }
  }, [dateFormat, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const addMonths = (isoDate: string, monthsToAdd: number) => {
        const d = new Date(isoDate);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const day = d.getUTCDate();
        const target = new Date(Date.UTC(year, month + monthsToAdd, 1));
        const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
        const safeDay = Math.min(day, lastDay);
        const result = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), safeDay));
        return result.toISOString().split('T')[0];
      };

      const baseDateISO = convertToISOFormat(data.date, dateFormat);
      const baseDueISO = data.dueDate ? convertToISOFormat(data.dueDate, dateFormat) : null;

      const basePayload = {
        description: data.description,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        type: "expense",
        status: data.status,
        expenseType: data.expenseType,
        isRecurring: !!data.isRecurring,
      } as any;

      const firstPayload = {
        ...basePayload,
        date: baseDateISO,
        dueDate: baseDueISO,
      };

      const created = await api("/api/transactions", { method: 'POST', body: JSON.stringify(firstPayload) });

      const repeats = Math.max(0, Number(data.repeatMonths || 0));
      if (repeats > 0) {
        const requests: Promise<any>[] = [];
        for (let i = 1; i <= repeats; i++) {
          const nextDateISO = addMonths(baseDateISO, i);
          const nextDueISO = baseDueISO ? addMonths(baseDueISO, i) : null;
          const payload = {
            ...basePayload,
            date: nextDateISO,
            dueDate: nextDueISO,
          };
          requests.push(api("/api/transactions", { method: 'POST', body: JSON.stringify(payload) }));
        }
        await Promise.all(requests);
      }

      return created;
    },
    onSuccess: () => {
      // Atualiza listas de despesas e Relatórios
      queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
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
      // Converter datas para o formato ISO antes de enviar para o servidor
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        type: "expense",
        date: convertToISOFormat(data.date, dateFormat),
        dueDate: data.dueDate ? convertToISOFormat(data.dueDate, dateFormat) : null,
        expenseType: data.expenseType,
      };
      return api(`/api/transactions/${initialData?.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      // Atualiza listas de despesas e Relatórios
      queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
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
        <CategorySelect
          categories={categories}
          value={form.watch("categoryId")}
          onChange={(value) => form.setValue("categoryId", value)}
          placeholder={t('expenses.selectCategory')}
        />
        {form.formState.errors.categoryId && (
          <p className="text-sm text-red-500">
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
          type={dateFormat === 'YYYY-MM-DD' ? "date" : "text"}
          placeholder={dateFormat}
          {...form.register("date")}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.date.message}
          </p>
        )}
        <p className="text-xs text-blue-500 mt-1 font-medium">
          {t('expenses.validation.dateFormat')}
        </p>
      </div>

      <div>
        <Label htmlFor="dueDate">{t('expenses.dueDate')}</Label>
        <Input
          id="dueDate"
          type={dateFormat === 'YYYY-MM-DD' ? "date" : "text"}
          placeholder={dateFormat}
          {...form.register("dueDate")}
        />
        {form.formState.errors.dueDate && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.dueDate.message}
          </p>
        )}
        <p className="text-xs text-blue-500 mt-1 font-medium">
          {t('expenses.validation.dueDateFormat')}
        </p>
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
        <Label htmlFor="isRecurring" className="cursor-pointer">
          {t('expenses.recurring')}
        </Label>
      </div>

      {form.watch("isRecurring") && (
        <div>
          <Label htmlFor="repeatMonths">Repetir por (meses)</Label>
          <Input
            id="repeatMonths"
            type="number"
            min={0}
            max={60}
            value={form.watch("repeatMonths") ?? 0}
            onChange={(e) => form.setValue("repeatMonths", Number(e.target.value))}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.loading') : initialData ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
