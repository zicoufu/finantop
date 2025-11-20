import { mysqlTable, text, int, boolean, timestamp, decimal, date } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export const users = mysqlTable("users", {
    id: int("id").primaryKey().autoincrement(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Accounts table (contas bancárias / cartões de crédito)
export const accounts = mysqlTable("accounts", {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    name: text("name").notNull(),
    // 'bank' | 'credit_card'
    type: text("type").notNull(),
    // Saldo atual da conta
    balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
    // Campos opcionais para cartão de crédito
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});
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
function foreignKey(config) {
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
});
export const userPreferences = mysqlTable("user_preferences", {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    language: text("language").default("pt-BR").notNull(),
    theme: text("theme").default("light").notNull(),
    currency: text("currency").default("BRL").notNull(),
    dateFormat: text("date_format").default("DD/MM/YYYY").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});
// Schemas for form validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGoalSchema = createInsertSchema(goals, {
    targetDate: z.coerce.date().optional().nullable(),
    monthlyContribution: z.coerce.number().min(0).optional().default(0),
    annualInterestRate: z.coerce.number().min(0, "Taxa de juros anual é obrigatória e deve ser no mínimo 0").max(100, "Taxa de juros anual não pode exceder 100%"), // Taxa em porcentagem, ex: 5 para 5%
}).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvestmentSchema = createInsertSchema(investments, {
    startDate: z.coerce.date(), // Garante a conversão de string para Date
    maturityDate: z.coerce.date().optional().nullable(), // Garante a conversão e mantém opcional
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateInvestmentSchema = insertInvestmentSchema.partial();
// Accounts: esquema simples (números serão normalizados na camada de serviço)
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions, {
    date: z.coerce.date(),
    dueDate: z.coerce.date().optional().nullable(),
    // amount: z.string().refine(value => !isNaN(parseFloat(value)), { message: "Amount must be a valid number string" }).transform(value => parseFloat(value).toFixed(2)),
    // categoryId, userId já são inferidos como number e notNull, o que é bom.
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateTransactionSchema = insertTransactionSchema.partial();
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences, {
    language: z.enum(["pt-BR", "en-US", "es"]).default("pt-BR"),
    theme: z.enum(["light", "dark", "system"]).default("light"),
    currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
    dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial();
// For other updates, you might use Partial<ValidatedInsertType> if a specific update schema doesn't exist
