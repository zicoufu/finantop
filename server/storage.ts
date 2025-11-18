import { 
  users, categories, transactions, goals, investments, alerts, userPreferences,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Goal, type InsertGoal,
  type Investment, type InsertInvestment,
  type Alert, type InsertAlert,
  type UserPreference, type InsertUserPreference,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import { type MySqlTransaction } from 'drizzle-orm/mysql-core';
import bcrypt from 'bcrypt';

// Tipagem para o cliente de transação do Drizzle
type TransactionClient = MySqlTransaction<any, any, any, any>;

// Renomeando a interface para evitar conflito com a interface Storage do DOM
export interface IAppStorage {
  runInTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser, tx?: TransactionClient): Promise<User>;
  getCategories(userId: number): Promise<Category[]>;
  getDefaultCategories(): Promise<Category[]>;
  createManyCategories(categories: InsertCategory[], tx?: TransactionClient): Promise<void>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByType(userId: number, type: string): Promise<Transaction[]>;
  getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getGoals(userId: number): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  getInvestments(userId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;
  getAlerts(userId: number): Promise<Alert[]>;
  getUnreadAlerts(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<boolean>;
  deleteAlert(id: number): Promise<boolean>;
  getUserPreferences(userId: number): Promise<UserPreference | undefined>;
  createUserPreferences(preferences: Omit<InsertUserPreference, 'id' | 'createdAt' | 'updatedAt'>, tx?: TransactionClient): Promise<UserPreference>;
  createOrUpdateUserPreferences(userId: number, preferences: Partial<InsertUserPreference>): Promise<UserPreference>;
  getCategoriesByType(userId: number, type: string): Promise<Category[]>;
  initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }>;
}

class DatabaseStorage implements IAppStorage {
  async runInTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async createUser(data: InsertUser, tx?: TransactionClient): Promise<User> {
    const dbClient = tx || db;
    const result = await dbClient.insert(users).values(data);
    const newUserId = result[0].insertId;
    const [newUser] = await dbClient.select().from(users).where(eq(users.id, newUserId));
    if (!newUser) {
      throw new Error("Failed to retrieve new user after creation.");
    }
    return newUser;
  }

  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return db.select()
      .from(categories)
      .where(and(
        eq(categories.userId, userId),
        eq(categories.type, type)
      ));
  }

  async getDefaultCategories(): Promise<Category[]> {
    const DEMO_USER_ID = 1;
    const existing = await db.select().from(categories).where(eq(categories.userId, DEMO_USER_ID));

    // Fallback em memória com um conjunto mínimo garantido (inclui pelo menos 1 de renda e diversas de despesa)
    const now = new Date();
    const fallback: Category[] = [
      // Rendas
      { id: 0, userId: DEMO_USER_ID, name: 'Salário', type: 'income', icon: 'cash', color: '#2ecc71', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Horas Extras', type: 'income', icon: 'overtime', color: '#27ae60', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Comissões', type: 'income', icon: 'commission', color: '#229954', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Freelance/Profissional Liberal', type: 'income', icon: 'freelance', color: '#1e8449', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Bônus e PLR', type: 'income', icon: 'bonus', color: '#2ecc71', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Juros', type: 'income', icon: 'interest', color: '#16a085', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Dividendos', type: 'income', icon: 'dividends', color: '#138d75', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Aluguéis', type: 'income', icon: 'rent', color: '#0e6655', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Royalties', type: 'income', icon: 'royalties', color: '#117864', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Ganhos de Capital', type: 'income', icon: 'capital-gains', color: '#1abc9c', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Lucro Empresarial', type: 'income', icon: 'business-profit', color: '#20c997', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Sócios e Participações', type: 'income', icon: 'partnerships', color: '#28a745', createdAt: now, updatedAt: now },
      // Despesas (usando nomes compatíveis com traduções)
      { id: 0, userId: DEMO_USER_ID, name: 'Moradia e Habitação', type: 'expense', icon: 'home', color: '#e74c3c', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Alimentação', type: 'expense', icon: 'food', color: '#f1c40f', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Transporte', type: 'expense', icon: 'car', color: '#3498db', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Saúde e Bem-estar', type: 'expense', icon: 'heart', color: '#9b59b6', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Educação', type: 'expense', icon: 'book', color: '#1abc9c', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Entretenimento', type: 'expense', icon: 'gamepad', color: '#e67e22', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Vestuário e Cuidados Pessoais', type: 'expense', icon: 'tshirt', color: '#34495e', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Serviços Domésticos', type: 'expense', icon: 'tools', color: '#7f8c8d', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Animais de Estimação', type: 'expense', icon: 'paw', color: '#8e44ad', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Despesas Financeiras', type: 'expense', icon: 'wallet', color: '#c0392b', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Impostos e Taxas', type: 'expense', icon: 'percent', color: '#d35400', createdAt: now, updatedAt: now },
      { id: 0, userId: DEMO_USER_ID, name: 'Outras Despesas', type: 'expense', icon: 'dots', color: '#95a5a6', createdAt: now, updatedAt: now },
    ];
    // Se já existirem categorias no usuário DEMO, garantimos que exista ao menos 1 de renda e 1 de despesa.
    if (existing && existing.length > 0) {
      const hasIncome = existing.some((c) => c.type === 'income');
      const hasExpense = existing.some((c) => c.type === 'expense');
      if (hasIncome && hasExpense) {
        return existing;
      }
      // Complementa com o que estiver faltando a partir do fallback em memória
      const additions = fallback.filter((c) => (c.type === 'income' && !hasIncome) || (c.type === 'expense' && !hasExpense));
      return [...existing, ...additions];
    }

    // Caso não haja nada no usuário DEMO, retorna o fallback completo
    return fallback;
  }

  async createManyCategories(data: InsertCategory[], tx?: TransactionClient): Promise<void> {
    const dbClient = tx || db;
    if (data.length === 0) return;
    await dbClient.insert(categories).values(data);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    if (!category.userId) {
      throw new Error('UserID é obrigatório para criar uma categoria.');
    }
    const result = await db.insert(categories).values(category);
    const [newCategory] = await db.select().from(categories).where(eq(categories.id, result[0].insertId));
    if (!newCategory) throw new Error('Failed to create category');
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories).set(category).where(eq(categories.id, id));
    const [updated] = await db.select().from(categories).where(eq(categories.id, id));
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .orderBy(asc(transactions.date));
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, type)
      ))
      .orderBy(desc(transactions.date));
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);
    
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, today),
        lte(transactions.date, futureDate)
      ))
      .orderBy(asc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Garantir datas corretas e timestamps exigidos pelo banco
    const normalizeAmount = (value: any): string => {
      if (value === null || value === undefined) return '0.00';
      if (typeof value === 'number') return value.toFixed(2);
      if (typeof value === 'string') {
        const withDot = value.replace(',', '.').trim();
        const num = Number(withDot);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid amount value: ${value}`);
        }
        return num.toFixed(2);
      }
      throw new Error(`Unsupported amount type: ${typeof value}`);
    };

    const transactionWithTimestamps: InsertTransaction & { createdAt: Date; updatedAt: Date; amount: string } = {
      ...transaction,
      amount: normalizeAmount((transaction as any).amount),
      date: typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date,
      dueDate: transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    // console.debug('[storage.createTransaction] Insert values:', transactionWithTimestamps);

    const result = await db.insert(transactions).values(transactionWithTimestamps);
    const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, result[0].insertId));
    if (!newTransaction) throw new Error('Failed to create transaction');
    await this.createAlertIfNeeded(newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    // Normalizar datas quando presentes e atualizar updatedAt
    const normalizeAmount = (value: any): string | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return '0.00';
      if (typeof value === 'number') return value.toFixed(2);
      if (typeof value === 'string') {
        const withDot = value.replace(',', '.').trim();
        const num = Number(withDot);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid amount value: ${value}`);
        }
        return num.toFixed(2);
      }
      throw new Error(`Unsupported amount type: ${typeof value}`);
    };

    const transactionWithTimestamp: Partial<InsertTransaction> & { updatedAt: Date; amount?: string } = {
      ...transaction,
      amount: normalizeAmount((transaction as any).amount),
      date: transaction.date ? (typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date) : undefined,
      dueDate: transaction.dueDate === null
        ? null
        : (transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : undefined),
      updatedAt: new Date(),
    } as any;

    // Remover chaves com valor undefined para não sobrescrever indevidamente
    Object.keys(transactionWithTimestamp).forEach((key) => ((transactionWithTimestamp as any)[key] === undefined) && delete (transactionWithTimestamp as any)[key]);

    await db.update(transactions).set(transactionWithTimestamp).where(eq(transactions.id, id));
    const [updated] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (updated) {
      await this.createAlertIfNeeded(updated);
    }
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    await db.delete(transactions).where(eq(transactions.id, id));
    return true;
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async getGoals(userId: number): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    // Normalizar valores e garantir timestamps obrigatórios
    const normalizeAmount = (value: any): string => {
      if (value === null || value === undefined) return '0.00';
      if (typeof value === 'number') return value.toFixed(2);
      if (typeof value === 'string') {
        const withDot = value.replace(',', '.').trim();
        const num = Number(withDot);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid amount value: ${value}`);
        }
        return num.toFixed(2);
      }
      throw new Error(`Unsupported amount type: ${typeof value}`);
    };

    const goalWithTimestamps: InsertGoal & { createdAt: Date; updatedAt: Date; targetAmount?: any; currentAmount?: any; monthlyContribution?: any; annualInterestRate?: any } = {
      ...goal,
      // Datas
      targetDate: (goal as any).targetDate ? (typeof (goal as any).targetDate === 'string' ? new Date((goal as any).targetDate) : (goal as any).targetDate) : null,
      // Números/valores monetários
      targetAmount: (goal as any).targetAmount !== undefined ? normalizeAmount((goal as any).targetAmount) : (goal as any).targetAmount,
      currentAmount: (goal as any).currentAmount !== undefined ? normalizeAmount((goal as any).currentAmount) : (goal as any).currentAmount,
      monthlyContribution: (goal as any).monthlyContribution !== undefined ? normalizeAmount((goal as any).monthlyContribution) : (goal as any).monthlyContribution,
      // Taxa anual pode ser decimal; manter como string normalizada com ponto
      annualInterestRate: (goal as any).annualInterestRate !== undefined
        ? (typeof (goal as any).annualInterestRate === 'number'
            ? (goal as any).annualInterestRate.toString()
            : (goal as any).annualInterestRate?.toString().replace(',', '.'))
        : (goal as any).annualInterestRate,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const result = await db.insert(goals).values(goalWithTimestamps);
    const [newGoal] = await db.select().from(goals).where(eq(goals.id, result[0].insertId));
    if (!newGoal) throw new Error('Failed to create goal');
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const normalizeAmount = (value: any): string | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return '0.00';
      if (typeof value === 'number') return value.toFixed(2);
      if (typeof value === 'string') {
        const withDot = value.replace(',', '.').trim();
        const num = Number(withDot);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid amount value: ${value}`);
        }
        return num.toFixed(2);
      }
      throw new Error(`Unsupported amount type: ${typeof value}`);
    };

    const goalWithTimestamp: Partial<InsertGoal> & { updatedAt: Date } = {
      ...goal,
      targetDate: (goal as any).targetDate === null
        ? null
        : ((goal as any).targetDate
            ? (typeof (goal as any).targetDate === 'string' ? new Date((goal as any).targetDate) : (goal as any).targetDate)
            : undefined),
      targetAmount: normalizeAmount((goal as any).targetAmount),
      currentAmount: normalizeAmount((goal as any).currentAmount),
      monthlyContribution: normalizeAmount((goal as any).monthlyContribution),
      annualInterestRate: (goal as any).annualInterestRate !== undefined
        ? (typeof (goal as any).annualInterestRate === 'number'
            ? (goal as any).annualInterestRate.toString()
            : (goal as any).annualInterestRate?.toString().replace(',', '.'))
        : undefined,
      updatedAt: new Date(),
    } as any;

    // Remover undefined para não sobrescrever indevido
    Object.keys(goalWithTimestamp).forEach((key) => ((goalWithTimestamp as any)[key] === undefined) && delete (goalWithTimestamp as any)[key]);

    await db.update(goals).set(goalWithTimestamp).where(eq(goals.id, id));
    const [updated] = await db.select().from(goals).where(eq(goals.id, id));
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    await db.delete(goals).where(eq(goals.id, id));
    return true;
  }

  async getInvestments(userId: number): Promise<Investment[]> {
    return db.select()
      .from(investments)
      .where(eq(investments.userId, userId))
      .orderBy(desc(investments.createdAt));
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const result = await db.insert(investments).values(investment);
    const [newInvestment] = await db.select()
      .from(investments)
      .where(eq(investments.id, result[0].insertId));
    
    if (!newInvestment) throw new Error('Failed to create investment');
    return newInvestment;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    await db.update(investments)
      .set(investment)
      .where(eq(investments.id, id));
    
    const [updated] = await db.select()
      .from(investments)
      .where(eq(investments.id, id));
    
    return updated;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    await db.delete(investments).where(eq(investments.id, id));
    return true;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return db.select()
      .from(alerts)
      .where(and(
        eq(alerts.userId, userId),
        eq(alerts.isRead, false)
      ))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const alertWithTimestamps = {
      ...alert,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    // console.debug('[storage.createAlert] Insert values:', alertWithTimestamps);
    const result = await db.insert(alerts).values(alertWithTimestamps);
    const [newAlert] = await db.select().from(alerts).where(eq(alerts.id, result[0].insertId));
    if (!newAlert) throw new Error('Failed to create alert');
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id));
    return true;
  }

  async deleteAlert(id: number): Promise<boolean> {
    await db.delete(alerts).where(eq(alerts.id, id));
    return true;
  }

  async getUserPreferences(userId: number): Promise<UserPreference | undefined> {
    const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preference;
  }

  async createUserPreferences(preferences: Omit<InsertUserPreference, 'id' | 'createdAt' | 'updatedAt'>, tx?: TransactionClient): Promise<UserPreference> {
    const dbClient = tx || db;
    const now = new Date();
    const result = await dbClient.insert(userPreferences).values({
      ...preferences,
      createdAt: now,
      updatedAt: now
    });
    const [newUserPreference] = await dbClient.select().from(userPreferences).where(eq(userPreferences.id, result[0].insertId));
    if (!newUserPreference) throw new Error("Failed to retrieve new user preference after creation.");
    return newUserPreference;
  }

  async createOrUpdateUserPreferences(userId: number, preferences: Partial<InsertUserPreference>): Promise<UserPreference> {
    // Verificar se já existem preferências para este usuário
    const existingPreferences = await this.getUserPreferences(userId);
    
    if (existingPreferences) {
      // Atualizar preferências existentes
      await db.update(userPreferences)
        .set(preferences)
        .where(eq(userPreferences.id, existingPreferences.id));
      
      const [updated] = await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.id, existingPreferences.id));
      
      if (!updated) throw new Error("Failed to update user preferences");
      return updated;
    } else {
      // Criar novas preferências
      const newPreferences = {
        userId,
        ...preferences
      } as InsertUserPreference;
      
      return this.createUserPreferences(newPreferences);
    }
  }

  private async createAlertIfNeeded(transaction: Transaction): Promise<void> {
    if (transaction.type === 'expense' && transaction.dueDate) {
      const dueDate = new Date(transaction.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
      const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (dayDiff <= 7) { 
        let alertMessage = `A despesa "${transaction.description}" vence em ${dayDiff} dia(s).`;
        if (dayDiff < 0) {
          alertMessage = `A despesa "${transaction.description}" venceu há ${Math.abs(dayDiff)} dia(s).`;
        } else if (dayDiff === 0) {
          alertMessage = `A despesa "${transaction.description}" vence hoje.`;
        }
        
        const alertData: InsertAlert = {
          userId: transaction.userId,
          message: alertMessage,
          type: 'due_date',
          referenceId: transaction.id,
          referenceType: 'transaction',
          isRead: false,
        };
        await this.createAlert(alertData);
      }
    }
  }

  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      console.log('[initializeSampleData] Iniciando criação de dados de exemplo...');
      const demoUserEmail = 'demo@example.com';
      console.log('[initializeSampleData] Verificando se usuário demo já existe:', demoUserEmail);
      
      // Verificar se o método getUserByEmail existe
      console.log('[initializeSampleData] Métodos disponíveis:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
      
      if (!this.getUserByEmail) {
        console.error('[initializeSampleData] ERRO: Método getUserByEmail não encontrado!');
        return { success: false, message: 'Método getUserByEmail não implementado' };
      }
      
      let user = await this.getUserByEmail(demoUserEmail);
      console.log('[initializeSampleData] Resultado da busca por usuário:', user);

      if (user) {
        console.log('[initializeSampleData] Usuário demo já existe, ID:', user.id);
        return { success: true, userId: user.id, message: 'Sample data already exists.' };
      }

      console.log('[initializeSampleData] Criando hash da senha para novo usuário demo...');
      const hashedPassword = await bcrypt.hash('demopassword', 10);
      console.log('[initializeSampleData] Hash da senha criado com sucesso');
      
      console.log('[initializeSampleData] Criando novo usuário demo...');
      console.log('[initializeSampleData] Dados do usuário a ser criado:', {
        name: 'Usuário Demo',
        username: 'demouser',
        email: demoUserEmail,
        password: '********' // Não logamos a senha por segurança
      });
      
      if (!this.createUser) {
        console.error('[initializeSampleData] ERRO: Método createUser não encontrado!');
        return { success: false, message: 'Método createUser não implementado' };
      }
      
      user = await this.createUser({
        name: 'Usuário Demo',
        username: 'demouser',
        email: demoUserEmail,
        password: hashedPassword,
      });
      console.log('[initializeSampleData] Usuário demo criado com sucesso, ID:', user.id);
      const newUserId = user.id;

      console.log('[initializeSampleData] Preparando categorias de exemplo...');
      const sampleCategoriesData = [
        { name: 'Salário', type: 'income', icon: 'cash', color: '#2ecc71' },
        { name: 'Moradia', type: 'expense', icon: 'home', color: '#e74c3c' },
        { name: 'Alimentação', type: 'expense', icon: 'food', color: '#f1c40f' },
      ];

      const categoriesToInsert = sampleCategoriesData.map(c => ({ ...c, userId: newUserId }));
      console.log('[initializeSampleData] Categorias a serem inseridas:', categoriesToInsert);
      
      if (!this.createManyCategories) {
        console.error('[initializeSampleData] ERRO: Método createManyCategories não encontrado!');
        return { success: false, message: 'Método createManyCategories não implementado' };
      }
      
      console.log('[initializeSampleData] Inserindo categorias de exemplo...');
      await this.createManyCategories(categoriesToInsert);
      console.log('[initializeSampleData] Categorias de exemplo inseridas com sucesso');

      console.log('[initializeSampleData] Dados de exemplo criados com sucesso para o usuário ID:', newUserId);
      return { success: true, userId: newUserId };
    } catch (error) {
      const err = error as Error;
      console.error('[initializeSampleData] Erro ao criar dados de exemplo:', err);
      console.error('[initializeSampleData] Stack trace:', err.stack);
      return { success: false, message: err.message };
    }
  }
}

export const storage: IAppStorage = new DatabaseStorage();
