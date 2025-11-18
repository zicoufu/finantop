import { 
  users, categories, transactions, goals, investments, alerts,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction, type ValidatedInsertTransaction, 
  type Goal, type InsertGoal, type ValidatedInsertGoal,
  type Investment, type InsertInvestment, type ValidatedInsertInvestment, 
  type Alert, type InsertAlert, type ValidatedInsertAlert 
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, or } from "drizzle-orm";

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
  getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByType(userId: number, type: string): Promise<Transaction[]>;
  getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Goals
  getGoals(userId: number): Promise<Goal[]>;
  createGoal(goal: ValidatedInsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<ValidatedInsertGoal>): Promise<Goal | undefined>;
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

  // Sample Data
  initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private goals: Map<number, Goal>;
  private investments: Map<number, Investment>;
  private alerts: Map<number, Alert>;
  private nextId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.goals = new Map();
    this.investments = new Map();
    this.alerts = new Map();
    this.nextId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.nextId++,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  // Categories
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(c => c.userId === userId);
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(c => c.userId === userId && c.type === type);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory: Category = {
      id: this.nextId++,
      ...category,
      createdAt: new Date(), // MemStorage sets this
      updatedAt: new Date()  // MemStorage sets this
    };
    this.categories.set(newCategory.id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updatedCategory = { ...existing, ...category, updatedAt: new Date() };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.userId === userId);
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId && t.date >= startDate && t.date <= endDate);
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId && t.type === type);
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId && t.date >= today && t.date <= futureDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      id: this.nextId++,
      userId: transaction.userId,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      status: transaction.status,
      isRecurring: transaction.isRecurring ?? false,
      expenseType: transaction.expenseType ?? null,
      date: typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date,
      dueDate: transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.transactions.set(newTransaction.id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    const updatedTransaction = { 
        ...existing, 
        ...transaction, 
        date: transaction.date ? (typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date) : existing.date,
        dueDate: transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : existing.dueDate,
        updatedAt: new Date() 
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Goals
  async getGoals(userId: number): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(g => g.userId === userId);
  }

  async createGoal(goal: ValidatedInsertGoal): Promise<Goal> {
    const newGoal: Goal = {
      id: this.nextId++,
      userId: goal.userId,
      name: goal.name,
      targetAmount: goal.targetAmount, // From InsertGoal, should be string
      description: goal.description ?? null,
      currentAmount: goal.currentAmount ?? '0.00',
      monthlyContribution: Number(goal.monthlyContribution).toFixed(2), // ValidatedInsertGoal has number, Goal has string
      annualInterestRate: Number(goal.annualInterestRate).toFixed(2), // ValidatedInsertGoal has number, Goal has string
      // status: goal.status ?? 'not_started', // Removed as 'status' is not in Goal schema type
      targetDate: goal.targetDate ? (typeof goal.targetDate === 'string' ? new Date(goal.targetDate) : goal.targetDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.goals.set(newGoal.id, newGoal);
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<ValidatedInsertGoal>): Promise<Goal | undefined> {
    const existing = this.goals.get(id);
    if (!existing) return undefined;
    const updatedGoal: Goal = {
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      name: goal.name ?? existing.name,
      targetAmount: goal.targetAmount ?? existing.targetAmount,
      description: goal.description !== undefined ? goal.description : existing.description,
      currentAmount: goal.currentAmount ?? existing.currentAmount,
      monthlyContribution: goal.monthlyContribution !== undefined ? Number(goal.monthlyContribution).toFixed(2) : existing.monthlyContribution, // Partial<ValidatedInsertGoal> has number?, Goal has string
      annualInterestRate: goal.annualInterestRate !== undefined ? Number(goal.annualInterestRate).toFixed(2) : existing.annualInterestRate, // Partial<ValidatedInsertGoal> has number?, Goal has string
      targetDate: goal.targetDate !== undefined ? (goal.targetDate === null ? null : (typeof goal.targetDate === 'string' ? new Date(goal.targetDate) : goal.targetDate)) : existing.targetDate,
      updatedAt: new Date(),
    };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<boolean> {
    return this.goals.delete(id);
  }

  // Investments
  async getInvestments(userId: number): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(i => i.userId === userId);
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const newInvestment: Investment = {
      id: this.nextId++,
      userId: investment.userId,
      name: investment.name,
      type: investment.type,
      amount: investment.amount, // From InsertInvestment, should be string
      interestRate: investment.interestRate, // From InsertInvestment (string) to Investment (string)
      // institution: investment.institution ?? null, // Removed as 'institution' is not in Investment schema type
      startDate: typeof investment.startDate === 'string' ? new Date(investment.startDate) : investment.startDate,
      maturityDate: investment.maturityDate ? (typeof investment.maturityDate === 'string' ? new Date(investment.maturityDate) : investment.maturityDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.investments.set(newInvestment.id, newInvestment);
    return newInvestment;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;
    const updatedInvestment = { 
        ...existing, 
        ...investment, 
        startDate: investment.startDate ? (typeof investment.startDate === 'string' ? new Date(investment.startDate) : investment.startDate) : existing.startDate, // Changed from purchaseDate
        updatedAt: new Date() 
    };
    this.investments.set(id, updatedInvestment);
    return updatedInvestment;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    return this.investments.delete(id);
  }

  // Alerts
  async getAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(a => a.userId === userId && !a.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const newAlert: Alert = {
      id: this.nextId++,
      isRead: false,
      referenceId: null,
      referenceType: null,
      ...alert,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.alerts.set(newAlert.id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = true;
      alert.updatedAt = new Date();
      this.alerts.set(id, alert);
      return true;
    }
    return false;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }

  // Sample Data
  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    if (this.users.size > 0) {
      return { success: true, message: "Sample data already initialized for MemStorage." };
    }
    try {
      console.log('[MemStorage] Initializing sample data...');
      const user = await this.createUser({
        username: 'usuario_teste_mem',
        password: 'senha123',
        email: 'teste_mem@example.com',
        name: 'Usuário Teste Memoria',
      });

      const categoriesData = [
        { userId: user.id, name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B' },
        { userId: user.id, name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3' },
        { userId: user.id, name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50' },
      ];
      const createdCategories: Category[] = [];
      for (const catData of categoriesData) {
        createdCategories.push(await this.createCategory(catData));
      }

      const alimentacaoCat = createdCategories.find(c => c.name === 'Alimentação');
      const salarioCat = createdCategories.find(c => c.name === 'Salário');

      if (alimentacaoCat && salarioCat) {
        await this.createTransaction({
          userId: user.id,
          description: 'Supermercado Mem',
          amount: '150.50',
          type: 'expense',
          categoryId: alimentacaoCat.id,
          date: new Date(),
          status: 'completed',
          isRecurring: false,
        });
        await this.createTransaction({
            userId: user.id,
            description: 'Salário Mensal Mem',
            amount: '5000.00',
            type: 'income',
            categoryId: salarioCat.id,
            date: new Date(),
            status: 'completed',
            isRecurring: false,
          });
      }
      console.log('[MemStorage] Sample data initialized successfully.');
      return { success: true, userId: user.id, message: 'Sample data initialized for MemStorage.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MemStorage] Error initializing sample data:', errorMessage);
      return { success: false, message: `Error initializing sample data for MemStorage: ${errorMessage}` };
    }
  }
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const userWithTimestamps = {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const result = await db.insert(users).values(userWithTimestamps);
    const newUserId = result[0].insertId;
    if (!newUserId) throw new Error("Failed to create user, no insertId returned.");
    const [newUser] = await db.select().from(users).where(eq(users.id, newUserId));
    if (!newUser) throw new Error("Failed to retrieve created user.");
    return newUser;
  }

  // Categories
  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name));
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return db.select().from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.type, type)))
      .orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const categoryWithTimestamps = {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await db.insert(categories).values(categoryWithTimestamps);
    const newCategoryId = result[0].insertId;
    if (!newCategoryId) throw new Error("Failed to create category, no insertId returned.");
    const [newCategoryData] = await db.select().from(categories).where(eq(categories.id, newCategoryId));
    if (!newCategoryData) throw new Error("Failed to retrieve created category.");
    return newCategoryData;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const categoryWithTimestamp = { ...category, updatedAt: new Date() };
    const result = await db.update(categories).set(categoryWithTimestamp).where(eq(categories.id, id));
    if (result[0].affectedRows === 0) return undefined;
    const [updatedCategory] = await db.select().from(categories).where(eq(categories.id, id));
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result[0].affectedRows > 0;
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate)))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
      .orderBy(desc(transactions.date));
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    return db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        or( 
          // Pending transactions with due date in the future (within 'days')
          and(eq(transactions.status, 'pending'), gte(transactions.dueDate, today), lte(transactions.dueDate, futureDate)),
          // Recurring transactions not yet completed, whose next occurrence is soon (this part is complex and might need a dedicated recurring engine)
          // For simplicity, we'll just fetch pending ones with due dates for now.
          // and(eq(transactions.isRecurring, true), ...)
        )
      ))
      .orderBy(asc(transactions.dueDate));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const transactionWithTimestamps = {
      ...transaction,
      date: typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date,
      dueDate: transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.insert(transactions).values(transactionWithTimestamps);
    const newTransactionId = result[0].insertId;
    if (!newTransactionId) throw new Error("Failed to create transaction, no insertId returned.");
    const [newTransactionData] = await db.select().from(transactions).where(eq(transactions.id, newTransactionId));
    if (!newTransactionData) throw new Error("Failed to retrieve created transaction.");
    return newTransactionData;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transactionWithTimestamp = {
      ...transaction,
      date: transaction.date ? (typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date) : undefined,
      dueDate: transaction.dueDate === null ? null : (transaction.dueDate ? (typeof transaction.dueDate === 'string' ? new Date(transaction.dueDate) : transaction.dueDate) : undefined),
      updatedAt: new Date()
    };
    Object.keys(transactionWithTimestamp).forEach(key => (transactionWithTimestamp as any)[key] === undefined && delete (transactionWithTimestamp as any)[key]);

    const result = await db.update(transactions).set(transactionWithTimestamp).where(eq(transactions.id, id));
    if (result[0].affectedRows === 0) return undefined;
    const [updatedTransaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return result[0].affectedRows > 0;
  }

  // Goals
  async getGoals(userId: number): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.targetDate));
  }

  async createGoal(goal: ValidatedInsertGoal): Promise<Goal> {
    const valuesToInsert = {
      userId: goal.userId,
      name: goal.name,
      targetAmount: goal.targetAmount, // string from ValidatedInsertGoal
      description: goal.description ?? null, // string | null from ValidatedInsertGoal
      currentAmount: goal.currentAmount ?? '0.00', // string from ValidatedInsertGoal
      monthlyContribution: (
        goal.monthlyContribution === undefined
          ? '0.00'
          : (typeof goal.monthlyContribution === 'number'
              ? goal.monthlyContribution.toFixed(2)
              : goal.monthlyContribution)
      ),
      annualInterestRate: (
        goal.annualInterestRate === undefined
          ? '0.00'
          : (typeof goal.annualInterestRate === 'number'
              ? goal.annualInterestRate.toFixed(2)
              : goal.annualInterestRate)
      ),
      targetDate: goal.targetDate ?? null, // Date | null from ValidatedInsertGoal (Zod coerces string to Date)
      // createdAt and updatedAt are set by the database default
    };
    const result = await db.insert(goals).values(valuesToInsert);
    const newGoalId = result[0].insertId;
    if (!newGoalId) throw new Error("Failed to create goal, no insertId returned.");
    const [newGoalData] = await db.select().from(goals).where(eq(goals.id, newGoalId));
    if (!newGoalData) throw new Error("Failed to retrieve created goal.");
    return newGoalData;
  }

  async updateGoal(id: number, goal: Partial<ValidatedInsertGoal>): Promise<Goal | undefined> {
    const valuesToUpdate: Partial<typeof goals.$inferInsert> = {};

    if (goal.name !== undefined) valuesToUpdate.name = goal.name;
    if (goal.targetAmount !== undefined) valuesToUpdate.targetAmount = goal.targetAmount;
    
    if (goal.hasOwnProperty('description')) { // Handle explicit null vs undefined
        valuesToUpdate.description = goal.description; // goal.description is string | null | undefined
    }
    if (goal.currentAmount !== undefined) { // goal.currentAmount is string | undefined
        valuesToUpdate.currentAmount = goal.currentAmount;
    }
    if (goal.monthlyContribution !== undefined) { // number | string | undefined
        valuesToUpdate.monthlyContribution = typeof goal.monthlyContribution === 'number'
          ? goal.monthlyContribution.toFixed(2)
          : goal.monthlyContribution;
    }
    if (goal.annualInterestRate !== undefined) { // number | string | undefined
        valuesToUpdate.annualInterestRate = typeof goal.annualInterestRate === 'number'
          ? goal.annualInterestRate.toFixed(2)
          : goal.annualInterestRate;
    }
    if (goal.hasOwnProperty('targetDate')) { // Handle explicit null vs undefined
        valuesToUpdate.targetDate = goal.targetDate; // goal.targetDate is Date | null | undefined
    }
    
    // updatedAt is handled by the database onUpdateNow() trigger

    if (Object.keys(valuesToUpdate).length === 0) {
      // No fields to update, fetch and return the current goal to match behavior
      const [currentGoalData] = await db.select().from(goals).where(eq(goals.id, id));
      return currentGoalData;
    }

    const result = await db.update(goals).set(valuesToUpdate).where(eq(goals.id, id));
    
    // Fetch the goal after attempting update to ensure correct return value
    // This handles cases where ID doesn't exist (returns undefined) or data didn't change (returns current state)
    const [updatedGoalData] = await db.select().from(goals).where(eq(goals.id, id));
    return updatedGoalData;
  }

  async deleteGoal(id: number): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return result[0].affectedRows > 0;
  }

  // Investments
  async getInvestments(userId: number): Promise<Investment[]> {
    return db.select().from(investments).where(eq(investments.userId, userId)).orderBy(asc(investments.startDate));
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const investmentWithTimestamps = {
      ...investment,
      startDate: investment.startDate ? (typeof investment.startDate === 'string' ? new Date(investment.startDate) : investment.startDate) : new Date(),
      maturityDate: investment.maturityDate ? (typeof investment.maturityDate === 'string' ? new Date(investment.maturityDate) : investment.maturityDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.insert(investments).values(investmentWithTimestamps);
    const newInvestmentId = result[0].insertId;
    if (!newInvestmentId) throw new Error("Failed to create investment, no insertId returned.");
    const [newInvestmentData] = await db.select().from(investments).where(eq(investments.id, newInvestmentId));
    if (!newInvestmentData) throw new Error("Failed to retrieve created investment.");
    return newInvestmentData;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const investmentWithTimestamp = {
      ...investment,
      startDate: investment.startDate ? (typeof investment.startDate === 'string' ? new Date(investment.startDate) : investment.startDate) : undefined,
      maturityDate: investment.maturityDate === null ? null : (investment.maturityDate ? (typeof investment.maturityDate === 'string' ? new Date(investment.maturityDate) : investment.maturityDate) : undefined),
      updatedAt: new Date()
    };
    Object.keys(investmentWithTimestamp).forEach(key => (investmentWithTimestamp as any)[key] === undefined && delete (investmentWithTimestamp as any)[key]);

    const result = await db.update(investments).set(investmentWithTimestamp).where(eq(investments.id, id));
    if (result[0].affectedRows === 0) return undefined;
    const [updatedInvestment] = await db.select().from(investments).where(eq(investments.id, id));
    return updatedInvestment;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    const result = await db.delete(investments).where(eq(investments.id, id));
    return result[0].affectedRows > 0;
  }

// Alerts
  async getAlerts(userId: number): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.isRead, false))).orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const alertWithTimestamps = {
      ...alert,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.insert(alerts).values(alertWithTimestamps);
    const newAlertId = result[0].insertId;
    if (!newAlertId) throw new Error("Failed to create alert, no insertId returned.");
    const [newAlertData] = await db.select().from(alerts).where(eq(alerts.id, newAlertId));
    if (!newAlertData) throw new Error("Failed to retrieve created alert.");
    return newAlertData;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    const result = await db.update(alerts).set({ isRead: true, updatedAt: new Date() }).where(eq(alerts.id, id));
    return result[0].affectedRows > 0;
  }

  async deleteAlert(id: number): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id));
    return result[0].affectedRows > 0;
  }

  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      console.log('[DatabaseStorage] Initializing sample data...');
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        console.log('[DatabaseStorage] Sample data (users) already exist. Skipping initialization.');
        return { success: true, userId: existingUsers[0].id, message: 'Sample data already exists.' };
      }

      // 1. Create User
      const userToInsert: InsertUser = {
        username: 'usuario_teste',
        password: 'senha123', // Em um app real, isso seria um hash
        email: 'teste@example.com',
        name: 'Usuário Teste',
      };
      const createdUser = await this.createUser(userToInsert);
      const userId = createdUser.id;

      // 2. Create Categories
      const demoCategoriesData: InsertCategory[] = [
        { userId, name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B' },
        { userId, name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3' },
        { userId, name: 'Lazer', type: 'expense', icon: '🎮', color: '#9C27B0' },
        { userId, name: 'Moradia', type: 'expense', icon: '🏠', color: '#FFC107' },
        { userId, name: 'Saúde', type: 'expense', icon: '❤️', color: '#E91E63' },
        { userId, name: 'Educação', type: 'expense', icon: '📚', color: '#00BCD4' },
        { userId, name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50' },
        { userId, name: 'Freelance', type: 'income', icon: '💻', color: '#FF9800' },
        { userId, name: 'Investimentos', type: 'income', icon: '📈', color: '#8BC34A' },
      ];
      
      const createdCategories: Category[] = [];
      for (const catData of demoCategoriesData) {
        createdCategories.push(await this.createCategory(catData)); 
      }

      const alimentacaoCat = createdCategories.find(c => c.name === 'Alimentação');
      const transporteCat = createdCategories.find(c => c.name === 'Transporte');
      const lazerCat = createdCategories.find(c => c.name === 'Lazer');
      const moradiaCat = createdCategories.find(c => c.name === 'Moradia');
      const salarioCat = createdCategories.find(c => c.name === 'Salário');
      const freelanceCat = createdCategories.find(c => c.name === 'Freelance');

      if (!alimentacaoCat || !transporteCat || !lazerCat || !salarioCat || !freelanceCat || !moradiaCat) {
        throw new Error('Failed to retrieve one or more sample categories after creation.');
      }

      // 3. Create Transactions
      const today = new Date();
      const demoTransactionsData: InsertTransaction[] = [
        {
          userId,
          description: 'Supermercado da Semana',
          amount: '250.75',
          type: 'expense',
          categoryId: alimentacaoCat.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
          status: 'completed',
          isRecurring: false,
        },
        {
          userId,
          description: 'Combustível Moto',
          amount: '50.00',
          type: 'expense',
          categoryId: transporteCat.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
          status: 'completed',
          isRecurring: false,
        },
        {
          userId,
          description: 'Cinema com Amigos',
          amount: '75.00',
          type: 'expense',
          categoryId: lazerCat.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
          status: 'pending',
          isRecurring: false,
        },
        {
          userId,
          description: 'Salário Mensal',
          amount: '7500.00',
          type: 'income',
          categoryId: salarioCat.id,
          date: new Date(today.getFullYear(), today.getMonth(), 1),
          status: 'completed',
          isRecurring: true,
          // recurrenceEndDate: null, // Removed as 'recurrenceEndDate' is not in Transaction schema
        },
        {
          userId,
          description: 'Projeto Freelance Website',
          amount: '1200.00',
          type: 'income',
          categoryId: freelanceCat.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10),
          status: 'completed',
          isRecurring: false,
        },
        {
            userId,
            description: 'Conta de Luz (Próximo Mês)',
            amount: '120.00',
            type: 'expense',
            categoryId: moradiaCat.id,
            date: new Date(today.getFullYear(), today.getMonth() + 1, 10),
            status: 'pending',
            isRecurring: true,
            dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 15)
        }
      ];

      for (const transData of demoTransactionsData) {
        await this.createTransaction(transData); 
      }
      
      // 4. Create Goals
      const demoGoalsData: Omit<ValidatedInsertGoal, 'userId'>[] = [
        {
            // userId is added in the loop when calling createGoal
            name: 'Viagem para a Praia',
            targetAmount: '10000.00',
            currentAmount: '1500.00',
            targetDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
            monthlyContribution: 200.00, // Changed to number
            annualInterestRate: 0.05, // Added as number (e.g., 5%)
            description: 'Economizar para uma viagem relaxante.' // Added description as it's in ValidatedInsertGoal
        },
        {
            // userId will be added if creating for a specific user, or handled by the caller
            name: 'Comprar Novo Notebook',
            targetAmount: '5000.00',
            currentAmount: '1500.00',
            targetDate: null, // No specific date
            monthlyContribution: 300.00, // Changed to number
            annualInterestRate: 0.05, // Added as number (e.g., 5%)
            description: 'Economizar para um notebook potente para trabalho e estudos.' // Added description as it's in ValidatedInsertGoal
        }
      ];
      for (const goalData of demoGoalsData) {
        // Ensure userId is present before calling createGoal if it's not part of goalData structure
        // For this example, assuming userId is available in the scope of initializeSampleData
        await this.createGoal({ ...goalData, userId }); 
      }

      // 5. Create Investments
      const demoInvestmentsData: InsertInvestment[] = [
        {
            userId,
            name: 'Tesouro Direto Selic',
            type: 'fixed_income',
            amount: '2000.00',
            interestRate: '0.10',
            startDate: new Date(today.getFullYear(), today.getMonth() - 6, 1),
            maturityDate: new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()),
        }
      ];
      for (const invData of demoInvestmentsData) {
        await this.createInvestment(invData);
      }

      console.log('[DatabaseStorage] Sample data initialized successfully.');
      return { success: true, userId, message: 'Sample data initialized successfully.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[DatabaseStorage] Error initializing sample data:', errorMessage, error);
      return { success: false, message: `Error initializing sample data: ${errorMessage}` };
    }
  }
}
