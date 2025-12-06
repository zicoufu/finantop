import { mysqlTable, text, varchar, int, boolean, timestamp, decimal, date, datetime } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 191 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(),
  // 'bank' | 'credit_card'
  type: text("type").notNull(),
  // Saldo atual da conta (para cartão pode ser usado como saldo da fatura atual)
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  // Campos opcionais específicos para cartão de crédito
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0.00"),
  closingDay: int("closing_day"),
  dueDay: int("due_day"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "accounts_user_id_fk",
  }),
}));

export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'categories_user_id_fk',
  })
}));

export const transactions = mysqlTable("transactions", {
  id: int("id").primaryKey().autoincrement(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  categoryId: int("category_id").notNull(),
  status: text("status").notNull(), // 'pending', 'paid', 'received', 'overdue'
  isRecurring: boolean("is_recurring").default(false).notNull(),
  expenseType: text("expense_type"), // 'fixed' or 'variable' (only for expenses)
  dueDate: date("due_date"),
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  categoryReference: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [categories.id],
    name: 'transactions_category_id_fk',
  }),
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'transactions_user_id_fk',
  })
}));

export const goals = mysqlTable("goals", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  targetDate: date("target_date"),
  monthlyContribution: decimal("monthly_contribution", { precision: 10, scale: 2 }).default('0').notNull(),
  annualInterestRate: decimal("annual_interest_rate", { precision: 5, scale: 2 }).default('0').notNull(), // e.g., 5.00 for 5%
  description: text("description"),
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'goals_user_id_fk',
  })
}));

// Helper function for foreign key constraints
function foreignKey(config: {
  columns: any[];
  foreignColumns: any[];
  name?: string;
}) {
  return {
    columns: config.columns,
    foreignColumns: config.foreignColumns,
    name: config.name,
  };
}

export const investments = mysqlTable("investments", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'cdb', 'lci_lca', 'tesouro_direto', 'funds'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  maturityDate: date("maturity_date"),
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'investments_user_id_fk',
  })
}));

export const alerts = mysqlTable("alerts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  type: text("type").notNull(), // 'bill_due', 'goal_achieved', 'unusual_spending'
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  referenceId: int("reference_id"),
  referenceType: text("reference_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'alerts_user_id_fk',
  })
}));

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  language: text("language").default("pt-BR").notNull(),
  theme: text("theme").default("light").notNull(),
  currency: text("currency").default("BRL").notNull(),
  dateFormat: text("date_format").default("DD/MM/YYYY").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
  userReference: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'user_preferences_user_id_fk',
  })
}));

// Schemas for form validation
// Esquema de validação de usuário com senha forte
export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string()
      .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
      .refine(
        (password) => /[A-Z]/.test(password),
        { message: "A senha deve conter pelo menos uma letra maiúscula" }
      )
      .refine(
        (password) => /[a-z]/.test(password),
        { message: "A senha deve conter pelo menos uma letra minúscula" }
      )
      .refine(
        (password) => /[0-9]/.test(password),
        { message: "A senha deve conter pelo menos um número" }
      )
      .refine(
        (password) => /[^A-Za-z0-9]/.test(password),
        { message: "A senha deve conter pelo menos um caractere especial" }
      )
  })
  .omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });

export const insertGoalSchema = createInsertSchema(goals, {
  targetDate: z.coerce.date().optional().nullable(),
  targetAmount: z.string().refine(value => !isNaN(parseFloat(value)), { message: "Valor alvo deve ser um número válido" }),
  currentAmount: z.string().optional().default('0').refine(value => !isNaN(parseFloat(value)), { message: "Valor atual deve ser um número válido" }),
  monthlyContribution: z.string().optional().default('0').refine(value => !isNaN(parseFloat(value)), { message: "Contribuição mensal deve ser um número válido" }),
  annualInterestRate: z.string().optional().default('0').refine(value => !isNaN(parseFloat(value)), { message: "Taxa de juros anual deve ser um número válido" }),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvestmentSchema = createInsertSchema(investments, {
  startDate: z.coerce.date(), // Garante a conversão de string para Date
  maturityDate: z.coerce.date().optional().nullable(), // Garante a conversão e mantém opcional
  amount: z.string().refine(value => !isNaN(parseFloat(value)), { message: "Valor do investimento deve ser um número válido" }),
  interestRate: z.string().refine(value => !isNaN(parseFloat(value)), { message: "Taxa de juros deve ser um número válido" }),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateInvestmentSchema = insertInvestmentSchema.partial();

// Accounts: permitir receber saldo/limite como número (ou string) e normalizar aqui
export const insertAccountSchema = createInsertSchema(accounts, {
  balance: z.coerce.number().min(0),
  creditLimit: z.coerce.number().min(0).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

// ---------- Transactions validation ----------
// Schema base vindo do Drizzle (sem refinamentos extras)
const baseInsertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Adiciona validações mais fortes para campos críticos
const transactionValidationSchema = baseInsertTransactionSchema.extend({
  // Converte amount (string ou número) para número positivo e armazena com 2 casas decimais
  amount: z.coerce
    .number({ invalid_type_error: "Valor deve ser numérico" })
    .min(0.01, { message: "Valor deve ser maior que zero" })
    .transform((value) => value.toFixed(2)),
  // Garante tipos e status válidos de forma explícita
  type: z.enum(["income", "expense"]),
  status: z.enum(["pending", "paid", "received", "overdue"]),
});

export const insertTransactionSchema = transactionValidationSchema.refine(
  (data) =>
    (data.type === "income" && ["pending", "received"].includes(data.status)) ||
    (data.type === "expense" && ["pending", "paid", "overdue"].includes(data.status)),
  {
    message: "Combinação inválida entre tipo e status da transação",
    path: ["status"],
  },
);

export const updateTransactionSchema = transactionValidationSchema.partial();

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserPreferencesSchema = createInsertSchema(userPreferences, {
  language: z.enum(["pt-BR", "en-US", "es"]).default("pt-BR"),
  theme: z.enum(["light", "dark", "system"]).default("light"),
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = typeof investments.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// Zod-inferred types for validated data (after Zod parsing/coercion)
export type ValidatedInsertUser = z.infer<typeof insertUserSchema>;
export type ValidatedInsertCategory = z.infer<typeof insertCategorySchema>;
export type ValidatedInsertTransaction = z.infer<typeof insertTransactionSchema>;
export type ValidatedInsertGoal = z.infer<typeof insertGoalSchema>;
export type ValidatedInsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type ValidatedInsertAlert = z.infer<typeof insertAlertSchema>;
export type ValidatedInsertAccount = z.infer<typeof insertAccountSchema>;
export type ValidatedInsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;
export type ValidatedUpdateUserPreference = z.infer<typeof updateUserPreferencesSchema>;

export type ValidatedUpdateTransaction = z.infer<typeof updateTransactionSchema>;
export type ValidatedUpdateInvestment = z.infer<typeof updateInvestmentSchema>;
// For other updates, you might use Partial<ValidatedInsertType> if a specific update schema doesn't exist
