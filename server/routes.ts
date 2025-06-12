import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertGoalSchema, insertInvestmentSchema, insertCategorySchema, insertAlertSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const DEMO_USER_ID = 1; // For demo purposes, using fixed user ID

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const type = req.query.type as string;
      let categories;
      
      if (type) {
        categories = await storage.getCategoriesByType(DEMO_USER_ID, type);
      } else {
        categories = await storage.getCategories(DEMO_USER_ID);
      }
      
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse({
        ...req.body,
        userId: DEMO_USER_ID
      });
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  // Transactions routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const { type, startDate, endDate, upcoming } = req.query;
      let transactions;

      if (upcoming) {
        const days = parseInt(upcoming as string) || 7;
        transactions = await storage.getUpcomingTransactions(DEMO_USER_ID, days);
      } else if (startDate && endDate) {
        transactions = await storage.getTransactionsByDateRange(
          DEMO_USER_ID, 
          startDate as string, 
          endDate as string
        );
      } else if (type) {
        transactions = await storage.getTransactionsByType(DEMO_USER_ID, type as string);
      } else {
        transactions = await storage.getTransactions(DEMO_USER_ID);
      }

      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId: DEMO_USER_ID
      });
      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(id, validatedData);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update transaction" });
      }
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTransaction(id);
      
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Goals routes
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getGoals(DEMO_USER_ID);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validatedData = insertGoalSchema.parse({
        ...req.body,
        userId: DEMO_USER_ID
      });
      const goal = await storage.createGoal(validatedData);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(id, validatedData);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update goal" });
      }
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGoal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Investments routes
  app.get("/api/investments", async (req, res) => {
    try {
      const investments = await storage.getInvestments(DEMO_USER_ID);
      res.json(investments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investments" });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const validatedData = insertInvestmentSchema.parse({
        ...req.body,
        userId: DEMO_USER_ID
      });
      const investment = await storage.createInvestment(validatedData);
      res.json(investment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create investment" });
      }
    }
  });

  // Alerts routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      let alerts;
      
      if (unreadOnly) {
        alerts = await storage.getUnreadAlerts(DEMO_USER_ID);
      } else {
        alerts = await storage.getAlerts(DEMO_USER_ID);
      }
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse({
        ...req.body,
        userId: DEMO_USER_ID
      });
      const alert = await storage.createAlert(validatedData);
      res.json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create alert" });
      }
    }
  });

  app.put("/api/alerts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markAlertAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Dashboard summary route
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = `${currentMonth}-31`;

      const monthlyTransactions = await storage.getTransactionsByDateRange(
        DEMO_USER_ID, 
        startOfMonth, 
        endOfMonth
      );

      const allTransactions = await storage.getTransactions(DEMO_USER_ID);
      const goals = await storage.getGoals(DEMO_USER_ID);
      const investments = await storage.getInvestments(DEMO_USER_ID);

      // Calculate monthly income and expenses
      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income' && t.status === 'received')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.status === 'paid')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Calculate current balance (simplified)
      const totalIncome = allTransactions
        .filter(t => t.type === 'income' && t.status === 'received')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalExpenses = allTransactions
        .filter(t => t.type === 'expense' && t.status === 'paid')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const currentBalance = totalIncome - totalExpenses;

      // Calculate total investments
      const totalInvestments = investments
        .reduce((sum, i) => sum + parseFloat(i.amount), 0);

      res.json({
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        totalInvestments,
        goalsCount: goals.length,
        transactionsCount: allTransactions.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // Investment simulation route
  app.post("/api/investments/simulate", async (req, res) => {
    try {
      const { amount, interestRate, years, monthlyContribution } = req.body;
      
      const principal = parseFloat(amount) || 0;
      const rate = parseFloat(interestRate) / 100;
      const periods = parseInt(years) || 1;
      const monthly = parseFloat(monthlyContribution) || 0;

      const results = [];
      let currentAmount = principal;
      
      for (let year = 1; year <= periods; year++) {
        // Add monthly contributions
        currentAmount += monthly * 12;
        // Apply compound interest
        currentAmount = currentAmount * (1 + rate);
        
        results.push({
          year,
          amount: Math.round(currentAmount * 100) / 100,
          totalContributed: principal + (monthly * 12 * year),
          totalReturn: Math.round((currentAmount - principal - (monthly * 12 * year)) * 100) / 100
        });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to simulate investment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
