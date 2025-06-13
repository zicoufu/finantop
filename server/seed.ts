import { db } from "./db";
import { users, categories, transactions } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Create demo user
  const [demoUser] = await db.insert(users).values({
    username: "demo",
    password: "demo123",
    name: "João Silva",
    email: "joao@example.com"
  }).returning();

  console.log("Created demo user:", demoUser.id);

  // Default expense categories
  const expenseCategories = [
    { name: "Alimentação", type: "expense", color: "#ef4444", icon: "fas fa-utensils", userId: demoUser.id },
    { name: "Transporte", type: "expense", color: "#3b82f6", icon: "fas fa-car", userId: demoUser.id },
    { name: "Moradia", type: "expense", color: "#10b981", icon: "fas fa-home", userId: demoUser.id },
    { name: "Lazer", type: "expense", color: "#f59e0b", icon: "fas fa-gamepad", userId: demoUser.id },
    { name: "Saúde", type: "expense", color: "#8b5cf6", icon: "fas fa-heart", userId: demoUser.id },
    { name: "Educação", type: "expense", color: "#6366f1", icon: "fas fa-book", userId: demoUser.id },
    { name: "Outros", type: "expense", color: "#6b7280", icon: "fas fa-ellipsis-h", userId: demoUser.id },
  ];

  // Default income categories
  const incomeCategories = [
    { name: "Salário", type: "income", color: "#059669", icon: "fas fa-briefcase", userId: demoUser.id },
    { name: "Freelance", type: "income", color: "#0891b2", icon: "fas fa-laptop", userId: demoUser.id },
    { name: "Investimentos", type: "income", color: "#7c3aed", icon: "fas fa-chart-line", userId: demoUser.id },
    { name: "Outros", type: "income", color: "#6b7280", icon: "fas fa-coins", userId: demoUser.id },
  ];

  const insertedCategories = await db.insert(categories).values([
    ...expenseCategories,
    ...incomeCategories
  ]).returning();

  console.log("Created categories:", insertedCategories.length);

  // Find category IDs for sample transactions
  const alimentacao = insertedCategories.find(c => c.name === "Alimentação");
  const transporte = insertedCategories.find(c => c.name === "Transporte");
  const moradia = insertedCategories.find(c => c.name === "Moradia");
  const lazer = insertedCategories.find(c => c.name === "Lazer");
  const outros = insertedCategories.find(c => c.name === "Outros" && c.type === "expense");

  // Add sample transactions with expense types
  const sampleTransactions = [
    // Fixed expenses
    {
      description: "Aluguel",
      amount: "1200.00",
      date: "2025-06-01",
      type: "expense",
      categoryId: moradia!.id,
      status: "paid",
      isRecurring: true,
      expenseType: "fixed",
      dueDate: null,
      userId: demoUser.id
    },
    {
      description: "Conta de Internet",
      amount: "89.90",
      date: "2025-06-05",
      type: "expense",
      categoryId: outros!.id,
      status: "paid",
      isRecurring: true,
      expenseType: "fixed",
      dueDate: null,
      userId: demoUser.id
    },
    {
      description: "Seguro do Carro",
      amount: "350.00",
      date: "2025-06-10",
      type: "expense",
      categoryId: transporte!.id,
      status: "pending",
      isRecurring: true,
      expenseType: "fixed",
      dueDate: "2025-06-15",
      userId: demoUser.id
    },
    // Variable expenses
    {
      description: "Supermercado",
      amount: "250.75",
      date: "2025-06-08",
      type: "expense",
      categoryId: alimentacao!.id,
      status: "paid",
      isRecurring: false,
      expenseType: "variable",
      dueDate: null,
      userId: demoUser.id
    },
    {
      description: "Cinema",
      amount: "35.00",
      date: "2025-06-11",
      type: "expense",
      categoryId: lazer!.id,
      status: "paid",
      isRecurring: false,
      expenseType: "variable",
      dueDate: null,
      userId: demoUser.id
    },
    {
      description: "Combustível",
      amount: "120.00",
      date: "2025-06-12",
      type: "expense",
      categoryId: transporte!.id,
      status: "paid",
      isRecurring: false,
      expenseType: "variable",
      dueDate: null,
      userId: demoUser.id
    }
  ];

  const insertedTransactions = await db.insert(transactions).values(sampleTransactions).returning();

  console.log("Created sample transactions:", insertedTransactions.length);
  console.log("Database seeded successfully!");
}

seed().catch(console.error);