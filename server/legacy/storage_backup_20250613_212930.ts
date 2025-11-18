import { 
  users, categories, transactions, goals, investments, alerts,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Goal, type InsertGoal,
  type Investment, type InsertInvestment,
  type Alert, type InsertAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(userId: number): Promise<Category[]>;
  getCategoriesByType(userId: number, type: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]>;
  getTransactionsByType(userId: number, type: string): Promise<Transaction[]>;
  getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Goals
  getGoals(userId: number): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;

  // Investments
  getInvestments(userId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;

  // Alerts
  getAlerts(userId: number): Promise<Alert[]>;
  getUnreadAlerts(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<boolean>;
  deleteAlert(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private goals: Map<number, Goal>;
  private investments: Map<number, Investment>;
  private alerts: Map<number, Alert>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.goals = new Map();
    this.investments = new Map();
    this.alerts = new Map();
    this.currentId = 1;

    // Initialize with demo user and default categories
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create demo user
    const demoUser: User = {
      id: 1,
      username: "demo",
      password: "demo123",
      name: "João Silva",
      email: "joao@example.com",
      createdAt: new Date()
    };
    this.users.set(1, demoUser);

    // Default expense categories
    const defaultExpenseCategories: Category[] = [
      { id: 2, name: "Alimentação", type: "expense", color: "#ef4444", icon: "fas fa-utensils", userId: 1 },
      { id: 3, name: "Transporte", type: "expense", color: "#3b82f6", icon: "fas fa-car", userId: 1 },
      { id: 4, name: "Moradia", type: "expense", color: "#10b981", icon: "fas fa-home", userId: 1 },
      { id: 5, name: "Lazer", type: "expense", color: "#f59e0b", icon: "fas fa-gamepad", userId: 1 },
      { id: 6, name: "Saúde", type: "expense", color: "#8b5cf6", icon: "fas fa-heart", userId: 1 },
      { id: 7, name: "Educação", type: "expense", color: "#6366f1", icon: "fas fa-book", userId: 1 },
      { id: 8, name: "Outros", type: "expense", color: "#6b7280", icon: "fas fa-ellipsis-h", userId: 1 },
    ];

    // Default income categories
    const defaultIncomeCategories: Category[] = [
      { id: 9, name: "Salário", type: "income", color: "#059669", icon: "fas fa-briefcase", userId: 1 },
      { id: 10, name: "Freelance", type: "income", color: "#0891b2", icon: "fas fa-laptop", userId: 1 },
      { id: 11, name: "Investimentos", type: "income", color: "#7c3aed", icon: "fas fa-chart-line", userId: 1 },
      { id: 12, name: "Outros", type: "income", color: "#6b7280", icon: "fas fa-coins", userId: 1 },
    ];

    [...defaultExpenseCategories, ...defaultIncomeCategories].forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    // Add sample transactions with expense types
    const now = new Date();
    const sampleTransactions: Transaction[] = [
      // Fixed expenses
      {
        id: 13,
        description: "Aluguel",
        amount: "1200.00",
        date: new Date(2025, 5, 1), // Mês é 0-based, então 5 = junho
        type: "expense",
        categoryId: 4, // Moradia
        status: "paid",
        isRecurring: true,
        expenseType: "fixed",
        dueDate: null,
        userId: 1,
        createdAt: now
      },
      {
        id: 14,
        description: "Conta de Internet",
        amount: "89.90",
        date: new Date(2025, 5, 5), // 5 de junho
        type: "expense",
        categoryId: 8, // Outros
        status: "paid",
        isRecurring: true,
        expenseType: "fixed",
        dueDate: null,
        userId: 1,
        createdAt: now
      },
      {
        id: 15,
        description: "Seguro do Carro",
        amount: "350.00",
        date: new Date(2025, 5, 10), // 10 de junho
        type: "expense",
        categoryId: 3, // Transporte
        status: "pending",
        isRecurring: true,
        expenseType: "fixed",
        dueDate: new Date(2025, 5, 15), // 15 de junho
        userId: 1,
        createdAt: now
      },
      // Variable expenses
      {
        id: 16,
        description: "Supermercado",
        amount: "250.75",
        date: new Date(2025, 5, 8), // 8 de junho
        type: "expense",
        categoryId: 2, // Alimentação
        status: "paid",
        isRecurring: false,
        expenseType: "variable",
        dueDate: null,
        userId: 1,
        createdAt: now
      },
      {
        id: 17,
        description: "Cinema",
        amount: "35.00",
        date: new Date(2025, 5, 11), // 11 de junho
        type: "expense",
        categoryId: 5, // Lazer
        status: "paid",
        isRecurring: false,
        expenseType: "variable",
        dueDate: null,
        userId: 1,
        createdAt: now
      },
      {
        id: 18,
        description: "Combustível",
        amount: "120.00",
        date: new Date(2025, 5, 12), // 12 de junho
        type: "expense",
        categoryId: 3, // Transporte
        status: "paid",
        isRecurring: false,
        expenseType: "variable",
        dueDate: null,
        userId: 1,
        createdAt: now
      }
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });

    this.currentId = 19;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Categories
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.userId === userId);
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.userId === userId && cat.type === type);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.userId === userId);
  }

  async getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]> {
    console.log(`[MemStorage] Buscando transações para o usuário ${userId} entre ${startDate} e ${endDate}`);
    
    // Função para converter string para Date com tratamento de erros detalhado
    const parseDate = (dateStr: string, fieldName: string): Date => {
      console.log(`[MemStorage] Convertendo ${fieldName}: '${dateStr}'`);
      
      // Se a data já for um timestamp, converte para Date
      if (!isNaN(Number(dateStr))) {
        const date = new Date(Number(dateStr));
        if (isNaN(date.getTime())) {
          throw new Error(`Timestamp inválido para ${fieldName}: ${dateStr}`);
        }
        console.log(`[MemStorage] ${fieldName} convertida de timestamp: ${date.toISOString()}`);
        return date;
      }
      
      // Tenta converter a string para Date
      const date = new Date(dateStr);
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        throw new Error(`Formato de data inválido para ${fieldName}: '${dateStr}'. Use o formato ISO 8601 (ex: YYYY-MM-DD) ou timestamp.`);
      }
      
      console.log(`[MemStorage] ${fieldName} convertida: ${date.toISOString()}`);
      return date;
    };
    
    try {
      // Validação dos parâmetros
      if (typeof userId !== 'number' || userId <= 0) {
        throw new Error(`ID de usuário inválido: ${userId}. Deve ser um número positivo.`);
      }
      
      if (typeof startDate !== 'string' || typeof endDate !== 'string') {
        throw new Error('As datas de início e fim devem ser strings.');
      }
      
      // Converte as strings de data para objetos Date
      console.log(`[MemStorage] Convertendo datas para o usuário ${userId}`);
      const startDateObj = parseDate(startDate, 'data inicial');
      const endDateObj = parseDate(endDate, 'data final');
      
      // Validação do intervalo de datas
      if (startDateObj > endDateObj) {
        throw new Error(`A data inicial (${startDateObj.toISOString()}) não pode ser posterior à data final (${endDateObj.toISOString()})`);
      }
      
      // Ajusta a data final para o final do dia
      const endOfDay = new Date(endDateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log(`[MemStorage] Período de busca: ${startDateObj.toISOString()} até ${endOfDay.toISOString()}`);
      
      const result = Array.from(this.transactions.values())
        .filter(t => {
          try {
            if (t.userId !== userId) return false;
            
            const transactionDate = t.date ? new Date(t.date) : new Date();
            return transactionDate >= startDateObj && transactionDate <= endOfDay;
          } catch (error) {
            const err = error as Error;
            console.error(`[MemStorage] Erro ao processar transação ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              transactionDate: t.date
            });
            return false; // Ignora transações com data inválida
          }
        })
        .map(t => ({
          ...t,
          // Garante que as datas sejam objetos Date
          date: t.date ? new Date(t.date) : new Date(),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          // Adiciona propriedades opcionais apenas se existirem
          ...(t.expenseType && { expenseType: t.expenseType }),
          ...(t.isRecurring !== undefined && { isRecurring: t.isRecurring })
        }));
      
      console.log(`[MemStorage] Encontradas ${result.length} transações no período`);
      
      if (result.length > 0) {
        console.log('[MemStorage] Primeira transação encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          date: result[0].date,
          type: result[0].type
        }));
      } else {
        console.log('[MemStorage] Nenhuma transação encontrada no período especificado');
      }
      
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error('[MemStorage] Erro ao buscar transações por intervalo de datas:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        startDate,
        endDate,
        timestamp: new Date().toISOString()
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    try {
      console.log(`[MemStorage] Buscando transações do tipo '${type}' para o usuário ${userId}`);
      
      // Verifica se o tipo é válido
      if (!['expense', 'income', 'transfer'].includes(type)) {
        const errorMsg = `[MemStorage] Tipo de transação inválido: ${type}`;
        console.error(errorMsg);
        throw new Error(`${errorMsg}. Tipos válidos: expense, income, transfer`);
      }
      
      const result = Array.from(this.transactions.values())
        .filter(t => t.userId === userId && t.type === type)
        .map(t => ({
          ...t,
          // Garante que as datas sejam objetos Date
          date: t.date ? new Date(t.date) : new Date(),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          // Adiciona propriedades opcionais apenas se existirem
          ...(t.expenseType && { expenseType: t.expenseType }),
          ...(t.isRecurring !== undefined && { isRecurring: t.isRecurring })
        }));
      
      console.log(`[MemStorage] Encontradas ${result.length} transações do tipo '${type}' para o usuário ${userId}`);
      
      if (result.length > 0) {
        console.log('[MemStorage] Primeira transação encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          date: result[0].date,
          type: result[0].type
        }));
      } else {
        console.log(`[MemStorage] Nenhuma transação encontrada para o tipo '${type}'`);
      }
      
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[MemStorage] Erro ao buscar transações do tipo '${type}' para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        type,
        timestamp: new Date().toISOString()
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    try {
      console.log(`[MemStorage] Buscando transações pendentes para os próximos ${days} dias para o usuário ${userId}`);
      
      // Validação do parâmetro days
      if (typeof days !== 'number' || days < 0) {
        const errorMsg = `[MemStorage] Número de dias inválido: ${days}. Deve ser um número positivo.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Início do dia atual
      
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);
      futureDate.setHours(23, 59, 59, 999); // Final do dia futuro
      
      console.log(`[MemStorage] Período de busca: ${today.toISOString()} até ${futureDate.toISOString()}`);
      
      const result = Array.from(this.transactions.values())
        .filter(t => {
          try {
            if (t.userId !== userId || t.status !== 'pending' || !t.dueDate) return false;
            
            const dueDate = new Date(t.dueDate);
            return dueDate >= today && dueDate <= futureDate;
          } catch (error) {
            const err = error as Error;
            console.error(`[MemStorage] Erro ao processar transação ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              dueDate: t.dueDate
            });
            return false; // Ignora transações com data inválida
          }
        })
        .map(t => ({
          ...t,
          // Garante que as datas sejam objetos Date
          date: t.date ? new Date(t.date) : new Date(),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          // Adiciona propriedades opcionais apenas se existirem
          ...(t.expenseType && { expenseType: t.expenseType }),
          ...(t.isRecurring !== undefined && { isRecurring: t.isRecurring })
        }));
      
      console.log(`[MemStorage] Encontradas ${result.length} transações pendentes no período`);
      
      if (result.length > 0) {
        console.log('[MemStorage] Primeira transação pendente encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          dueDate: result[0].dueDate,
          status: result[0].status
        }));
      } else {
        console.log('[MemStorage] Nenhuma transação pendente encontrada no período');
      }
      
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error('[MemStorage] Erro ao buscar transações pendentes:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        days,
        timestamp: new Date().toISOString()
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id, 
      createdAt: new Date(),
      isRecurring: transaction.isRecurring || false,
      dueDate: transaction.dueDate || null,
      expenseType: transaction.expenseType || null
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...transaction };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Goals
  async getGoals(userId: number): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(g => g.userId === userId);
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const id = this.currentId++;
    // Garante que os campos opcionais tenham valores padrão
    const goalWithDefaults = { 
      ...goal,
      id,
      // Forçar os tipos para garantir que os campos opcionais tenham os tipos corretos
      currentAmount: goal.currentAmount ?? '0',
      description: goal.description ?? null,
      targetDate: goal.targetDate ?? null,
      createdAt: new Date()
    } as const satisfies Omit<Goal, 'id' | 'createdAt'> & { id: number; createdAt: Date };
    
    this.goals.set(id, goalWithDefaults);
    return goalWithDefaults;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const existing = this.goals.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...goal };
    this.goals.set(id, updated);
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    return this.goals.delete(id);
  }

  // Investments
  async getInvestments(userId: number): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(i => i.userId === userId);
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const id = this.currentId++;
    // Garante que os campos opcionais tenham valores padrão
    const investmentWithDefaults = { 
      ...investment,
      id,
      // Forçar o tipo para garantir que maturityDate seja Date | null
      maturityDate: investment.maturityDate ?? null,
      createdAt: new Date()
    } as const satisfies Omit<Investment, 'id' | 'createdAt'> & { id: number; createdAt: Date };
    
    this.investments.set(id, investmentWithDefaults);
    return investmentWithDefaults;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...investment };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    return this.investments.delete(id);
  }

  // Alerts
  async getAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(a => a.userId === userId);
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(a => a.userId === userId && !a.isRead);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.currentId++;
    // Garante que os campos opcionais tenham valores padrão
    const alertWithDefaults = { 
      ...alert,
      id,
      // Forçar os tipos para garantir que os campos opcionais tenham os tipos corretos
      isRead: alert.isRead ?? false,
      referenceId: alert.referenceId ?? null,
      referenceType: alert.referenceType ?? null,
      createdAt: new Date()
    } as const satisfies Omit<Alert, 'id' | 'createdAt'> & { id: number; createdAt: Date };
    
    this.alerts.set(id, alertWithDefaults);
    return alertWithDefaults;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    
    alert.isRead = true;
    this.alerts.set(id, alert);
    return true;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Garante que todos os campos opcionais tenham valores padrão
    const userWithDefaults = {
      avatar: null,
      preferences: {},
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db
      .insert(users)
      .values(userWithDefaults)
      .execute();
    
    // Busca o usuário mais recente (que deve ser o que acabamos de criar)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, insertUser.username))
      .orderBy(desc(users.id))
      .limit(1);
      
    if (!user) {
      throw new Error('Falha ao criar usuário');
    }
    
    return user;
  }

  async getCategories(userId: number): Promise<Category[]> {
    try {
      console.log(`[getCategories] Buscando categorias para o usuário ${userId}`);
      
      const { eq } = await import('drizzle-orm');
      const result = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
        .execute();
      
      console.log(`[getCategories] Encontradas ${result.length} categorias para o usuário ${userId}`);
      
      // Retorna as categorias sem modificar, pois não há campos de data adicionais no esquema
      const processedCategories = result.map(c => {
        try {
          return {
            ...c
            // Não há campos de data adicionais no esquema de categorias
          };
        } catch (error) {
          const err = error as Error;
          console.error(`[getCategories] Erro ao processar categoria ${c.id}:`, {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
          throw err;
        }
      });
      
      return processedCategories;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[getCategories] Erro ao buscar categorias para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    console.log(`[getCategoriesByType] Buscando categorias do tipo '${type}' para o usuário ${userId}`);
    
    try {
      // Verifica se o tipo é válido
      if (!['expense', 'income', 'transfer'].includes(type)) {
        const errorMsg = `[getCategoriesByType] Tipo de categoria inválido: ${type}`;
        console.error(errorMsg);
        throw new Error(`${errorMsg}. Tipos válidos: expense, income, transfer`);
      }
      
      const { and, eq } = await import('drizzle-orm');
      
      console.log(`[getCategoriesByType] Executando consulta no banco de dados para o usuário ${userId}`);
      const result = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            eq(categories.type, type)
          )
        )
        .orderBy(categories.name)
        .execute();
      
      console.log(`[getCategoriesByType] Encontradas ${result.length} categorias do tipo '${type}' para o usuário ${userId}`);
      
      if (result.length > 0) {
        console.log(`[getCategoriesByType] Primeira categoria encontrada:`, JSON.stringify(result[0]));
      } else {
        console.log(`[getCategoriesByType] Nenhuma categoria encontrada para o tipo '${type}'`);
      }
      
      // Retorna as categorias sem modificar, pois não há campos de data adicionais no esquema
      const processedResults = result.map(c => {
        try {
          return {
            ...c
            // Não há campos de data adicionais no esquema de categorias
          };
        } catch (error) {
          const err = error as Error;
          console.error(`[getCategoriesByType] Erro ao processar categoria ${c.id}:`, {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
          throw err;
        }
      });
      
      console.log(`[getCategoriesByType] Processamento de categorias concluído para o usuário ${userId}`);
      return processedResults;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[getCategoriesByType] Erro ao buscar categorias do tipo '${type}' para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    // Cria um objeto com valores padrão apenas para campos não fornecidos
    const categoryData = {
      ...category,
      icon: category.icon ?? 'default-icon', // Usa o valor fornecido ou o padrão
      color: category.color ?? '#808080' // Usa o valor fornecido ou o padrão
    };
    
    await db
      .insert(categories)
      .values(categoryData)
      .execute();
    
    // Busca a categoria mais recente do usuário (que deve ser a que acabamos de criar)
    const [newCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, category.userId))
      .orderBy(desc(categories.id))
      .limit(1);
      
    if (!newCategory) {
      throw new Error('Falha ao criar categoria');
    }
    
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      console.log(`[updateCategory] Iniciando atualização da categoria ${id}`);
      
      // Primeiro verifica se a categoria existe
      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id));
      
      if (!existing) {
        console.warn(`[updateCategory] Categoria com ID ${id} não encontrada`);
        return undefined;
      }
      
      console.log(`[updateCategory] Dados para atualização:`, category);
      
      // Atualiza a categoria sem o campo updatedAt que não existe no schema
      await db
        .update(categories)
        .set(category)
        .where(eq(categories.id, id))
        .execute();
      
      // Retorna a categoria atualizada
      const [updated] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id));
      
      if (!updated) {
        console.error(`[updateCategory] Falha ao recuperar a categoria ${id} após atualização`);
        return undefined;
      }
      
      console.log(`[updateCategory] Categoria ${id} atualizada com sucesso`);
      return updated;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[updateCategory] Erro ao atualizar categoria ${id}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw error; // Propaga o erro para ser tratado pelo chamador
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Primeiro verifica se a categoria existe
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    if (!category) {
      return false;
    }
    
    // Se existir, tenta excluir
    await db
      .delete(categories)
      .where(eq(categories.id, id))
      .execute();
    
    // Verifica se foi excluída com sucesso
    const [deleted] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    return !deleted; // Retorna true se a categoria não existe mais
  }

  /**
   * Busca todas as transações de um usuário
   * @param userId ID do usuário
   * @returns Array de transações do usuário
   * @throws {Error} Se o usuário não for encontrado ou ocorrer um erro na consulta
   */
  async getTransactions(userId: number): Promise<Transaction[]> {
    try {
      console.log(`[DatabaseStorage] Buscando todas as transações para o usuário ${userId}`);
      
      const { eq } = await import('drizzle-orm');
      
      // Verifica se o usuário existe
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (user.length === 0) {
        const errorMsg = `Usuário com ID ${userId} não encontrado`;
        console.error(`[DatabaseStorage] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Busca as transações ordenadas por data
      console.log(`[DatabaseStorage] Executando consulta de transações para o usuário ${userId}`);
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(transactions.date);
      
      console.log(`[DatabaseStorage] Encontradas ${result.length} transações para o usuário ${userId}`);
      
      if (result.length > 0) {
        console.log('[DatabaseStorage] Primeira transação encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          date: result[0].date,
          type: result[0].type
        }));
      } else {
        console.log(`[DatabaseStorage] Nenhuma transação encontrada para o usuário ${userId}`);
      }
      
      // Processa os resultados para garantir que os tipos estejam corretos e buscar categorias
      const processedResults = await Promise.all(
        result.map(async (t) => {
          try {
            // Busca a categoria associada se existir
            let category = null;
            if (t.categoryId) {
              const categoryResults = await db
                .select()
                .from(categories)
                .where(eq(categories.id, t.categoryId))
                .limit(1);
              category = categoryResults[0] || null;
            }

            // Cria o objeto de transação com os tipos corretos
            const transaction = {
              ...t,
              date: t.date ? (typeof t.date === 'string' ? new Date(t.date) : t.date) : new Date(),
              dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : null,
              createdAt: t.createdAt ? (typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt) : new Date(),
              amount: t.amount ? t.amount.toString() : '0.00', // Garante que o valor decimal seja retornado como string
              isRecurring: Boolean(t.isRecurring),
              ...(t.expenseType && { expenseType: t.expenseType }),
              ...(category && { category }) // Inclui a categoria se existir
            };
            
            console.log(`[DatabaseStorage] Transação processada:`, {
              id: transaction.id,
              description: transaction.description,
              amount: transaction.amount,
              date: transaction.date,
              type: transaction.type,
              status: transaction.status,
              categoryId: transaction.categoryId
            });
            
            return transaction;
          } catch (error) {
            const err = error as Error;
            console.error(`[DatabaseStorage] Erro ao processar transação ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              transactionDate: t.date
            });
            throw err;
          }
        })
      );
      
      console.log(`[DatabaseStorage] Processamento de transações concluído para o usuário ${userId}`);
      return processedResults;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[DatabaseStorage] Erro ao buscar transações para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }

  /**
   * Busca transações de um usuário dentro de um intervalo de datas
   * @param userId ID do usuário
   * @param startDate Data inicial (string no formato ISO 8601 ou timestamp)
   * @param endDate Data final (string no formato ISO 8601 ou timestamp)
   * @returns Array de transações dentro do intervalo especificado
   * @throws {Error} Se as datas forem inválidas ou ocorrer um erro na consulta
   */
  async getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]> {
    console.log(`[DatabaseStorage] Buscando transações para o usuário ${userId} entre ${startDate} e ${endDate}`);
    
    try {
      const { and, eq, gte, lte, asc } = await import('drizzle-orm');
      
      // Função para converter string para Date
      const parseDate = (dateStr: string, fieldName: string): Date => {
        console.log(`[DatabaseStorage] Convertendo ${fieldName}: '${dateStr}'`);
        
        // Se a data já for um timestamp, converte para Date
        if (!isNaN(Number(dateStr))) {
          const date = new Date(Number(dateStr));
          if (isNaN(date.getTime())) {
            throw new Error(`Timestamp inválido para ${fieldName}: ${dateStr}`);
          }
          console.log(`[DatabaseStorage] ${fieldName} convertida de timestamp: ${date.toISOString()}`);
          return date;
        }
        
        // Tenta converter a string para Date
        const date = new Date(dateStr);
        
        // Verifica se a data é válida
        if (isNaN(date.getTime())) {
          throw new Error(`Formato de data inválido para ${fieldName}: '${dateStr}'. Use o formato ISO 8601 (ex: YYYY-MM-DD) ou timestamp.`);
        }
        
        console.log(`[DatabaseStorage] ${fieldName} convertida: ${date.toISOString()}`);
        return date;
      };
      
      // Converte as strings de data para objetos Date
      console.log(`[DatabaseStorage] Convertendo datas de entrada para o usuário ${userId}`);
      const startDateObj = parseDate(startDate, 'data inicial');
      const endDateObj = parseDate(endDate, 'data final');
      
      // Validação do intervalo de datas
      if (startDateObj > endDateObj) {
        throw new Error(`A data inicial (${startDateObj.toISOString()}) não pode ser posterior à data final (${endDateObj.toISOString()})`);
      }
      
      // Ajusta a data final para o final do dia
      const endOfDay = new Date(endDateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log(`[DatabaseStorage] Buscando transações de ${startDateObj.toISOString()} até ${endOfDay.toISOString()}`);
      
      // Executa a consulta usando objetos Date
      console.log(`[DatabaseStorage] Executando consulta no banco de dados para o usuário ${userId}`);
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, startDateObj),
            lte(transactions.date, endOfDay)
          )
        )
        .orderBy(asc(transactions.date));

      console.log(`[DatabaseStorage] Encontradas ${result.length} transações para o usuário ${userId}`);
      
      if (result.length > 0) {
        console.log('[DatabaseStorage] Primeira transação encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          date: result[0].date,
          type: result[0].type
        }));
      } else {
        console.log(`[DatabaseStorage] Nenhuma transação encontrada no período especificado`);
      }
      
      // Processa os resultados para garantir que os tipos estejam corretos e buscar categorias
      const processedResults = await Promise.all(
        result.map(async (t) => {
          try {
            // Busca a categoria associada se existir
            let category = null;
            if (t.categoryId) {
              const categoryResults = await db
                .select()
                .from(categories)
                .where(eq(categories.id, t.categoryId))
                .limit(1);
              category = categoryResults[0] || null;
            }

            // Cria o objeto de transação com os tipos corretos
            const transaction = {
              ...t,
              date: t.date ? (typeof t.date === 'string' ? new Date(t.date) : t.date) : new Date(),
              dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : null,
              createdAt: t.createdAt ? (typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt) : new Date(),
              amount: t.amount ? t.amount.toString() : '0.00', // Garante que o valor decimal seja retornado como string
              isRecurring: Boolean(t.isRecurring),
              ...(t.expenseType && { expenseType: t.expenseType }),
              ...(category && { category }) // Inclui a categoria se existir
            };
            
            console.log(`[DatabaseStorage] Transação processada:`, {
              id: transaction.id,
              description: transaction.description,
              amount: transaction.amount,
              date: transaction.date,
              type: transaction.type,
              status: transaction.status,
              categoryId: transaction.categoryId
            });
            
            return transaction;
          } catch (error) {
            const err = error as Error;
            console.error(`[DatabaseStorage] Erro ao processar transação ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              transactionDate: t.date
            });
            throw err;
          }
        })
      );
      
      console.log(`[DatabaseStorage] Processamento de transações concluído para o usuário ${userId}`);
      return processedResults;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[DatabaseStorage] Erro ao buscar transações por intervalo de datas para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        startDate,
        endDate,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }

  /**
   * Busca transações de um usuário por tipo (despesa, receita ou transferência)
   * @param userId ID do usuário
   * @param type Tipo de transação ('expense', 'income' ou 'transfer')
   * @returns Array de transações do tipo especificado
   * @throws {Error} Se o tipo for inválido ou ocorrer um erro na consulta
   */
  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    try {
      console.log(`[DatabaseStorage] Buscando transações do tipo '${type}' para o usuário ${userId}`);
      
      // Validação do tipo de transação
      if (!['expense', 'income', 'transfer'].includes(type)) {
        const errorMsg = `Tipo de transação inválido: '${type}'. Tipos válidos: 'expense', 'income' ou 'transfer'`;
        console.error(`[DatabaseStorage] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Importa operadores necessários do Drizzle
      const { and, eq } = await import('drizzle-orm');

      // Verifica se o usuário existe
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (user.length === 0) {
        const errorMsg = `Usuário com ID ${userId} não encontrado`;
        console.error(`[DatabaseStorage] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Busca as transações do tipo especificado
      console.log(`[DatabaseStorage] Buscando transações do tipo '${type}' para o usuário ${userId}`);
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, type)
          )
        )
        .orderBy(transactions.date);

      console.log(`[DatabaseStorage] Encontradas ${result.length} transações do tipo '${type}'`);

      // Processa os resultados para garantir que os tipos estejam corretos e buscar categorias
      const processedResults = await Promise.all(
        result.map(async (t) => {
          try {
            // Busca a categoria associada se existir
            let category = null;
            if (t.categoryId) {
              const categoryResults = await db
                .select()
                .from(categories)
                .where(eq(categories.id, t.categoryId))
                .limit(1);
              category = categoryResults[0] || null;
            }

            
            // Cria o objeto de transação com os tipos corretos
            const transaction = {
              ...t,
              date: t.date ? (typeof t.date === 'string' ? new Date(t.date) : t.date) : new Date(),
              dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : null,
              createdAt: t.createdAt ? (typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt) : new Date(),
              amount: t.amount ? t.amount.toString() : '0.00', // Garante que o valor decimal seja retornado como string
              isRecurring: Boolean(t.isRecurring),
              ...(t.expenseType && { expenseType: t.expenseType }),
              ...(category && { category }) // Inclui a categoria se existir
            };
            
            console.log(`[DatabaseStorage] Transação processada:`, {
              id: transaction.id,
              description: transaction.description,
              amount: transaction.amount,
              date: transaction.date,
              type: transaction.type,
              status: transaction.status,
              categoryId: transaction.categoryId
            });
            
            return transaction;
          } catch (error) {
            const err = error as Error;
            console.error(`[DatabaseStorage] Erro ao processar transação ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              transactionDate: t.date
            });
            throw err;
          }
        })
      );

      console.log(`[DatabaseStorage] Processamento concluído com sucesso para o usuário ${userId}`);
      return processedResults;

    } catch (error) {
      const err = error as Error;
      console.error(`[DatabaseStorage] Erro ao buscar transações por tipo:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        type,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }

  /**
   * Busca transações futuras de um usuário dentro de um determinado número de dias
   * @param userId ID do usuário
   * @param days Número de dias a partir de hoje para buscar transações futuras
   * @returns Array de transações futuras dentro do período especificado
   * @throws {Error} Se o número de dias for inválido ou ocorrer um erro na consulta
   */
  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    try {
      console.log(`[DatabaseStorage] Buscando transações futuras para os próximos ${days} dias do usuário ${userId}`);
      
      // Validação do parâmetro days
      if (days < 0) {
        const errorMsg = `Número de dias inválido: ${days}. O número de dias deve ser maior ou igual a zero.`;
        console.error(`[DatabaseStorage] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      const { and, eq, gte, lte } = await import('drizzle-orm');
      
      // Verifica se o usuário existe
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (user.length === 0) {
        const errorMsg = `Usuário com ID ${userId} não encontrado`;
        console.error(`[DatabaseStorage] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Define o intervalo de datas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);
      futureDate.setHours(23, 59, 59, 999);
      
      console.log(`[DatabaseStorage] Buscando transações futuras de ${today.toISOString()} até ${futureDate.toISOString()}`);
      
      // Busca as transações futuras
      console.log(`[DatabaseStorage] Executando consulta de transações futuras para o usuário ${userId}`);
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, today),
            lte(transactions.date, futureDate)
          )
        )
        .orderBy(transactions.date);
      
      console.log(`[DatabaseStorage] Encontradas ${result.length} transações futuras para o usuário ${userId}`);
      
      if (result.length > 0) {
        console.log('[DatabaseStorage] Primeira transação futura encontrada:', JSON.stringify({
          id: result[0].id,
          description: result[0].description,
          amount: result[0].amount,
          date: result[0].date,
          type: result[0].type
        }));
      } else {
        console.log(`[DatabaseStorage] Nenhuma transação futura encontrada no período especificado`);
      }
      
      // Processa os resultados para garantir que os tipos estejam corretos e buscar categorias
      const processedResults = await Promise.all(
        result.map(async (t) => {
          try {
            // Busca a categoria associada se existir
            let category = null;
            if (t.categoryId) {
              const categoryResults = await db
                .select()
                .from(categories)
                .where(eq(categories.id, t.categoryId))
                .limit(1);
              category = categoryResults[0] || null;
            }

            // Cria o objeto de transação com os tipos corretos
            const transaction = {
              ...t,
              date: t.date ? (typeof t.date === 'string' ? new Date(t.date) : t.date) : new Date(),
              dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : null,
              createdAt: t.createdAt ? (typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt) : new Date(),
              amount: t.amount ? t.amount.toString() : '0.00', // Garante que o valor decimal seja retornado como string
              isRecurring: Boolean(t.isRecurring),
              ...(t.expenseType && { expenseType: t.expenseType }),
              ...(category && { category }) // Inclui a categoria se existir
            };
            
            console.log(`[DatabaseStorage] Transação futura processada:`, {
              id: transaction.id,
              description: transaction.description,
              amount: transaction.amount,
              date: transaction.date,
              type: transaction.type,
              status: transaction.status,
              categoryId: transaction.categoryId
            });
            
            return transaction;
          } catch (error) {
            const err = error as Error;
            console.error(`[DatabaseStorage] Erro ao processar transação futura ${t.id}:`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
              transactionId: t.id,
              transactionDate: t.date
            });
            throw err;
          }
        })
      );
      
      console.log(`[DatabaseStorage] Processamento de transações futuras concluído para o usuário ${userId}`);
      return processedResults;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[DatabaseStorage] Erro ao buscar transações futuras para o usuário ${userId}:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        userId,
        days,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Primeiro insere a transação
    await db
      .insert(transactions)
      .values(transaction)
      .execute();
    
    // Busca a transação mais recente do usuário (que deve ser a que acabamos de criar)
    const [newTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, transaction.userId))
      .orderBy(desc(transactions.id))
      .limit(1);
      
    if (!newTransaction) {
      throw new Error('Falha ao criar transação');
    }
    
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    await db
      .update(transactions)
      .set(transaction)
      .where(eq(transactions.id, id))
      .execute();
    
    // Busca a transação atualizada
    const [updated] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
      
    return updated || undefined;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    // Primeiro verifica se a transação existe
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (!transaction) {
      return false;
    }
    
    // Se existir, tenta excluir
    await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .execute();
    
    // Verifica se foi excluído com sucesso
    const [deleted] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return !deleted; // Retorna true se não encontrar mais a transação
  }

  async getGoals(userId: number): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    // Garante que todos os campos opcionais tenham valores padrão
    const goalWithDefaults = {
      description: null,
      currentAmount: '0',
      targetDate: null,
      ...goal
    };
    
    await db
      .insert(goals)
      .values(goalWithDefaults)
      .execute();
    
    // Busca a meta mais recente do usuário (que deve ser a que acabamos de criar)
    const [newGoal] = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, goal.userId))
      .orderBy(desc(goals.id))
      .limit(1);
      
    if (!newGoal) {
      throw new Error('Falha ao criar meta');
    }
    
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    // Primeiro verifica se a meta existe
    const [existing] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id));
    
    if (!existing) {
      return undefined;
    }
    
    // Atualiza a meta
    await db
      .update(goals)
      .set(goal)
      .where(eq(goals.id, id))
      .execute();
    
    // Retorna a meta atualizada
    const [updated] = await db
      .select()
      .from(goals)
  }

  async getInvestments(userId: number): Promise<Investment[]> {
    return await db.select().from(investments).where(eq(investments.userId, userId));
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    // Garante que todos os campos opcionais tenham valores padrão
    const investmentWithDefaults = {
      maturityDate: null,
      notes: null,
      ...investment
    };
    
    await db
      .insert(investments)
      .values(investmentWithDefaults)
      .execute();
    
    // Busca o investimento mais recente do usuário (que deve ser o que acabamos de criar)
    const [newInvestment] = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, investment.userId))
      .orderBy(desc(investments.id))
      .limit(1);
      
    if (!newInvestment) {
      throw new Error('Falha ao criar investimento');
    }
    
    return newInvestment;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    // Primeiro verifica se o investimento existe
    const [existing] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, id));
    
    if (!existing) {
      return undefined;
    }
    
    // Atualiza o investimento
    await db
      .update(investments)
      .set(investment)
      .where(eq(investments.id, id))
      .execute();
    
    // Retorna o investimento atualizado
    const [updated] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, id));
      
    return updated || undefined;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    // Primeiro verifica se o investimento existe
    const [investment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, id));
    
    if (!investment) {
      return false;
    }
    
    // Se existir, tenta excluir
    await db
      .delete(investments)
      .where(eq(investments.id, id))
      .execute();
    
    // Verifica se foi excluído com sucesso
    const [deleted] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, id));
    
    return !deleted; // Retorna true se o investimento não existe mais
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return await db.select().from(alerts).where(eq(alerts.userId, userId));
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.userId, userId),
        eq(alerts.isRead, false)
      ));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    // Garante que isRead tenha um valor padrão de false se não for fornecido
    const alertWithDefaults = {
      isRead: false,
      referenceId: null,
      referenceType: null,
      ...alert
    };
    
    await db
      .insert(alerts)
      .values(alertWithDefaults)
      .execute();
    
    // Busca o alerta mais recente do usuário (que deve ser o que acabamos de criar)
    const [newAlert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, alert.userId))
      .orderBy(desc(alerts.id))
      .limit(1);
      
    if (!newAlert) {
      throw new Error('Falha ao criar alerta');
    }
    
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    // Primeiro verifica se o alerta existe
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id));
    
    if (!alert) {
      return false;
    }
    
    // Se existir, tenta atualizar
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .execute();
    
    // Verifica se foi atualizado com sucesso
    const [updated] = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.id, id),
        eq(alerts.isRead, true)
      ));
    
    return !!updated; // Retorna true se o alerta foi marcado como lido
  }

  async deleteAlert(id: number): Promise<boolean> {
    // Primeiro verifica se o alerta existe
}

async deleteGoal(id: number): Promise<boolean> {
// Primeiro verifica se a meta existe
const [goal] = await db
  .select()
  .from(goals)
  .where(eq(goals.id, id));
  
if (!goal) {
  return false;
}
  
// Se existir, tenta excluir
await db
  .delete(goals)
  .where(eq(goals.id, id))
  .execute();
  
// Verifica se foi excluída com sucesso
const [deleted] = await db
  .select()
  .from(goals)
  .where(eq(goals.id, id));
  
return !deleted; // Retorna true se a meta não existe mais
}

async getInvestments(userId: number): Promise<Investment[]> {
return await db.select().from(investments).where(eq(investments.userId, userId));
}

async createInvestment(investment: InsertInvestment): Promise<Investment> {
// Garante que todos os campos opcionais tenham valores padrão
const investmentWithDefaults = {
  maturityDate: null,
  notes: null,
  ...investment
};
  
await db
  .insert(investments)
  .values(investmentWithDefaults)
  .execute();
  
// Busca o investimento mais recente do usuário (que deve ser o que acabamos de criar)
const [newInvestment] = await db
  .select()
  .from(investments)
  .where(eq(investments.userId, investment.userId))
  .orderBy(desc(investments.id))
  .limit(1);
    
if (!newInvestment) {
  throw new Error('Falha ao criar investimento');
}
  
return newInvestment;
}

async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
// Primeiro verifica se o investimento existe
const [existing] = await db
  .select()
  .from(investments)
  .where(eq(investments.id, id));
  
if (!existing) {
  return undefined;
}
  
// Atualiza o investimento
await db
  .update(investments)
  .set(investment)
  .where(eq(investments.id, id))
  .execute();
  
// Retorna o investimento atualizado
const [updated] = await db
  .select()
  .from(investments)
  .where(eq(investments.id, id));
    
return updated || undefined;
}

async deleteInvestment(id: number): Promise<boolean> {
// Primeiro verifica se o investimento existe
const [investment] = await db
  .select()
  .from(investments)
  .where(eq(investments.id, id));
  
if (!investment) {
  return false;
}
  
// Se existir, tenta excluir
await db
  .delete(investments)
  .where(eq(investments.id, id))
  .execute();
  
// Verifica se foi excluído com sucesso
const [deleted] = await db
  .select()
  .from(investments)
  .where(eq(investments.id, id));
  
return !deleted; // Retorna true se o investimento não existe mais
}

async getAlerts(userId: number): Promise<Alert[]> {
return await db.select().from(alerts).where(eq(alerts.userId, userId));
}

async getUnreadAlerts(userId: number): Promise<Alert[]> {
return await db
  .select()
  .from(alerts)
  .where(and(
    eq(alerts.userId, userId),
    eq(alerts.isRead, false)
  ));
}

async createAlert(alert: InsertAlert): Promise<Alert> {
// Garante que isRead tenha um valor padrão de false se não for fornecido
const alertWithDefaults = {
  isRead: false,
  referenceId: null,
  referenceType: null,
  ...alert
};
  
await db
  .insert(alerts)
  .values(alertWithDefaults)
  .execute();
  
// Busca o alerta mais recente do usuário (que deve ser o que acabamos de criar)
const [newAlert] = await db
  .select()
  .from(alerts)
  .where(eq(alerts.userId, alert.userId))
  .orderBy(desc(alerts.id))
  .limit(1);
    
if (!newAlert) {
  throw new Error('Falha ao criar alerta');
}
  
return newAlert;
}

async markAlertAsRead(id: number): Promise<boolean> {
// Primeiro verifica se o alerta existe
const [alert] = await db
  .select()
  .from(alerts)
  .where(eq(alerts.id, id));
  
if (!alert) {
  return false;
}
  
// Se existir, tenta atualizar
await db
  .update(alerts)
  .set({ isRead: true })
  .where(eq(alerts.id, id))
  .execute();
  
// Verifica se foi atualizado com sucesso
const [updated] = await db
  .select()
  .from(alerts)
  .where(and(
    eq(alerts.id, id),
    eq(alerts.isRead, true)
  ));
  
return !!updated; // Retorna true se o alerta foi marcado como lido
}

async deleteAlert(id: number): Promise<boolean> {
const { eq } = await import('drizzle-orm');
  
await db
  .delete(alerts)
  .where(eq(alerts.id, id));
    
// Verifica se foi excluído com sucesso
const [deleted] = await db
  .select()
  .from(alerts)
  .where(eq(alerts.id, id));
    
return !deleted; // Retorna true se o alerta não existe mais
}

/**
 * Inicializa dados de exemplo para demonstração
 * @returns Objeto com status da operação
 */
async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
try {
  console.log('[DatabaseStorage] Inicializando dados de exemplo...');
  
  // Verifica se já existem usuários
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    // Adiciona um usuário de exemplo
    const [newUser] = await db.insert(users).values({
      username: 'usuario_teste',
      password: 'senha123', // Em produção, use hash seguro
      email: 'teste@example.com',
      name: 'Usuário Teste',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Busca o usuário recém-criado para obter o ID
    const [user] = await db.select().from(users).where(eq(users.username, 'usuario_teste'));
    
    if (!user) {
      throw new Error('Falha ao recuperar o usuário criado');
    }
    
    console.log(`[DatabaseStorage] Usuário de exemplo criado com ID: ${user.id}`);
    
    // Adiciona categorias de exemplo
    const demoCategories = [
      { userId: user.id, name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B', createdAt: new Date(), updatedAt: new Date() },
      { userId: user.id, name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3', createdAt: new Date(), updatedAt: new Date() },
      { userId: user.id, name: 'Lazer', type: 'expense', icon: '🎮', color: '#9C27B0', createdAt: new Date(), updatedAt: new Date() },
      { userId: user.id, name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50', createdAt: new Date(), updatedAt: new Date() },
      { userId: user.id, name: 'Freelance', type: 'income', icon: '💼', color: '#FF9800', createdAt: new Date(), updatedAt: new Date() }
    ];
    
    await db.insert(categories).values(demoCategories);
    console.log('[DatabaseStorage] Categorias de exemplo adicionadas');
    
    // Busca as categorias recém-criadas para obter seus IDs
    const userCategories = await db.select().from(categories).where(eq(categories.userId, user.id));
    
    // Encontra os IDs das categorias
    const alimentacaoCat = userCategories.find(c => c.name === 'Alimentação');
    const transporteCat = userCategories.find(c => c.name === 'Transporte');
    const salarioCat = userCategories.find(c => c.name === 'Salário');
    
    if (!alimentacaoCat || !transporteCat || !salarioCat) {
      throw new Error('Falha ao recuperar categorias de exemplo');
    }
    
    // Adiciona transações de exemplo
    const today = new Date();
    const demoTransactions = [
      {
        userId: user.id,
        description: 'Supermercado',
        amount: '250.75',
        type: 'expense',
        categoryId: alimentacaoCat.id,
        date: today,
        status: 'completed',
        isRecurring: false,
        createdAt: today,
        updatedAt: today
      },
      {
        userId: user.id,
        description: 'Ônibus',
        amount: '5.50',
        type: 'expense',
        categoryId: transporteCat.id,
        date: today,
        status: 'completed',
        isRecurring: true,
        createdAt: today,
        updatedAt: today
      },
      {
        userId: user.id,
        description: 'Salário',
        amount: '5000.00',
        type: 'income',
        categoryId: salarioCat.id,
        date: today,
        status: 'completed',
        isRecurring: true,
        createdAt: today,
        updatedAt: today
      }
    ];
    
    await db.insert(transactions).values(demoTransactions);
    console.log('[DatabaseStorage] Transações de exemplo adicionadas');
    
    return { success: true, userId: user.id };
  } else {
    console.log('[DatabaseStorage] Dados de exemplo já inicializados');
    return { success: false, message: 'Dados já inicializados' };
  }
} catch (error) {
  console.error('[DatabaseStorage] Erro ao inicializar dados de exemplo:', error);
  throw error;
}
}

}

export const storage = new DatabaseStorage();
