import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertUserSchema, insertTransactionSchema, updateTransactionSchema, insertGoalSchema, insertInvestmentSchema, updateInvestmentSchema, insertCategorySchema, insertAlertSchema, insertUserPreferencesSchema, updateUserPreferencesSchema, insertAccountSchema } from "../shared/schema.js";
import { z } from "zod";
import { hashPassword, comparePassword, createJWT, protect } from "./auth.js";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";

export async function registerRoutes(app: Express): Promise<Server> {
  // ================================
  // Passport Google OAuth
  // ================================
  app.use(passport.initialize());
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/auth/google/callback";
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5174';
  const USE_HASH_ROUTER = (process.env.USE_HASH_ROUTER || 'false').toLowerCase() === 'true';

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('[OAuth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados. Fluxo Google desativado.');
  } else {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    }, async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails && profile.emails[0]?.value;
        const name = profile.displayName || 'Google User';
        const googleId = profile.id;
        if (!email) {
          return done(new Error('Email não disponível pelo Google'), undefined);
        }

  // =================================================================
  // ACCOUNTS ROUTES (BANK / CREDIT CARD)
  // =================================================================

  app.get("/api/accounts", protect, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      const accounts = await storage.getAccounts(userId);
      return res.json(accounts);
    } catch (error) {
      const err = error as Error;
      console.error("[GET /api/accounts] Error:", err.message, err.stack);
      return res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", protect, async (req, res) => {
    console.log("[POST /api/accounts] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      const validatedData = insertAccountSchema.parse({
        ...req.body,
        userId,
      });

      const account = await storage.createAccount(validatedData as any);
      console.log("[POST /api/accounts] Conta criada com sucesso", account.id);
      return res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[POST /api/accounts] Erro de validação:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      const err = error as Error;
      console.error("[POST /api/accounts] Erro ao criar conta:", err.message, err.stack);
      return res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.delete("/api/accounts/:id", protect, async (req, res) => {
    console.log(`[DELETE /api/accounts/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      const success = await storage.deleteAccount(id);
      if (!success) {
        return res.status(404).json({ message: "Account not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      console.error("[DELETE /api/accounts/:id] Erro ao remover conta:", err.message, err.stack);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });
        let user = await storage.getUserByEmail(email);
        if (!user) {
          const usernameBase = email.split('@')[0]?.replace(/[^a-zA-Z0-9_\-\.]/g, '') || `google_${googleId}`;
          const username = usernameBase.length > 2 ? usernameBase : `google_${googleId}`;
          const randomPassword = `google_${googleId}_${Date.now()}`;
          const hashedPassword = await hashPassword(randomPassword);
          // Criar usuário + preferências + categorias padrão similar ao cadastro
          user = await storage.runInTransaction(async (tx) => {
            const newUser = await storage.createUser({
              email,
              name,
              username,
              password: hashedPassword,
            }, tx);
            await storage.createUserPreferences({ userId: newUser.id }, tx);
            const defaultCategories = await storage.getDefaultCategories();
            if (defaultCategories.length > 0) {
              const userCategories = defaultCategories.map(cat => ({
                ...cat,
                userId: newUser.id,
                id: undefined as any,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));
              await storage.createManyCategories(userCategories, tx);
            }
            return newUser;
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err as any, undefined);
      }
    }));
  
    // Rota para iniciar OAuth
    app.get('/api/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account'
    }));

    // Callback do Google -> emitir JWT e redirecionar para o frontend (com logs de erro)
    app.get('/api/auth/google/callback', (req, res, next) => {
      passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err || !user) {
          console.error('[OAuth] Google callback error:', err || info);
          if (err && (err as any).data) {
            console.error('[OAuth] Error data:', (err as any).data);
          }
          const failureUrl = `${FRONTEND_ORIGIN}/#/login?error=oauth`;
          return res.redirect(302, failureUrl);
        }
        const token = createJWT({ id: (user as any).id, username: (user as any).username, email: (user as any).email });
        const callbackPath = USE_HASH_ROUTER ? '/#/oauth/callback' : '/oauth/callback';
        const redirectUrl = `${FRONTEND_ORIGIN}${callbackPath}?token=${encodeURIComponent(token)}`;
        return res.redirect(302, redirectUrl);
      })(req, res, next);
    });
  }

  function formatRelativeDueDate(dueDateInput: string | Date): string {
    // Ensure dueDateInput is parsed as UTC midnight for accurate day-level comparison
    let dueDate: Date;
    if (typeof dueDateInput === 'string') {
      // Handles 'YYYY-MM-DD' by appending time and Z to signify UTC
      dueDate = new Date(`${dueDateInput}T00:00:00Z`);
    } else {
      // If it's already a Date object, ensure it's treated as UTC midnight of its date part
      const y = dueDateInput.getUTCFullYear();
      const m = dueDateInput.getUTCMonth();
      const d = dueDateInput.getUTCDate();
      dueDate = new Date(Date.UTC(y, m, d));
    }

    const today = new Date();
    const todayUTCStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    const diffTime = dueDate.getTime() - todayUTCStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else if (diffDays > 1) {
      return `Due in ${diffDays} days`;
    } else if (diffDays === -1) {
      return "Overdue since yesterday";
    } else { // diffDays < -1
      return `Overdue by ${Math.abs(diffDays)} days`;
    }
  }
  const DEMO_USER_ID = 1; // For demo purposes, using fixed user ID
  
  // Helper function to get user ID from JWT token or use DEMO_USER_ID as fallback
  const getUserIdFromRequest = (req: any): number => {
    // If user is authenticated (protect middleware was used), use the user ID from token
    if (req.user && req.user.id) {
      console.log(`[getUserIdFromRequest] Using authenticated user ID: ${req.user.id}`);
      return req.user.id;
    }
    
    // If there is no authenticated user, use the demo user ID
    console.log(`[getUserIdFromRequest] No authenticated user, using demo ID: ${DEMO_USER_ID}`);
    return DEMO_USER_ID;
  }

  // =================================================================
  // AUTHENTICATION ROUTES
  // =================================================================

  const loginSchema = z.object({
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(1, { message: "A senha não pode estar em branco" }),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("[POST /api/auth/register] Recebida requisição de registro.");
      console.log("[POST /api/auth/register] Dados recebidos:", JSON.stringify(req.body));
      
      try {
        const validatedData = insertUserSchema.parse(req.body);
        console.log("[POST /api/auth/register] Dados validados:", validatedData);
      } catch (validationError) {
        console.error("[POST /api/auth/register] Erro de validação:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Dados inválidos", errors: validationError.flatten().fieldErrors });
        }
        throw validationError;
      }
      
      const validatedData = insertUserSchema.parse(req.body);

      console.log("[POST /api/auth/register] Verificando se usuário existe...");
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("[POST /api/auth/register] Usuário já existe:", validatedData.email);
        return res.status(409).json({ message: "Um usuário com este email já existe." });
      }
      console.log("[POST /api/auth/register] Usuário não existe, continuando registro.");

      console.log("[POST /api/auth/register] Gerando hash da senha...");
      const hashedPassword = await hashPassword(validatedData.password);
      console.log("[POST /api/auth/register] Hash da senha gerado.");

      // Iniciar transação do banco de dados
      let newUser;
      try {
        newUser = await storage.runInTransaction(async (tx) => {
          // 0. Criar usuário
          console.log("[POST /api/auth/register] Criando usuário dentro da transação...");
          let user;
          try {
            user = await storage.createUser({ ...validatedData, password: hashedPassword }, tx);
          } catch (err: any) {
            console.error('[POST /api/auth/register] Falha em createUser', {
              step: 'createUser',
              code: err?.code,
              errno: err?.errno,
              sqlState: err?.sqlState,
              sqlMessage: err?.sqlMessage,
              sql: err?.sql,
              message: err?.message,
              stack: err?.stack,
            });
            throw err;
          }
          const newUserId = user.id;
          console.log(`[POST /api/auth/register] Usuário criado com ID: ${newUserId}`);

          // 1. Criar preferências do usuário
          console.log(`[POST /api/auth/register] Criando preferências para o usuário ${newUserId}...`);
          try {
            await storage.createUserPreferences({ userId: newUserId }, tx);
          } catch (err: any) {
            console.error('[POST /api/auth/register] Falha em createUserPreferences', {
              step: 'createUserPreferences',
              code: err?.code,
              errno: err?.errno,
              sqlState: err?.sqlState,
              sqlMessage: err?.sqlMessage,
              sql: err?.sql,
              message: err?.message,
              stack: err?.stack,
            });
            throw err;
          }
          console.log("[POST /api/auth/register] Preferências criadas.");

          // 2. (Temporariamente desativado) Criar categorias padrão para o novo usuário.
          // Problemas de schema entre categorias e user_id em produção estão causando erros SQL,
          // então, por enquanto, vamos apenas criar usuário + preferências.
          // O usuário poderá criar categorias manualmente pelo app.

          return user;
        });
      } catch (dbErr: any) {
        // Tratar erros de duplicidade (username/email) que escapem da verificação prévia
        const msg = String(dbErr?.message || '');
        const code = dbErr?.code;
        console.error('[POST /api/auth/register] Erro ao criar usuário na transação (outer catch):', {
          code,
          errno: dbErr?.errno,
          sqlState: dbErr?.sqlState,
          sqlMessage: dbErr?.sqlMessage,
          sql: dbErr?.sql,
          message: msg,
          stack: dbErr?.stack,
        });
        if (code === 'ER_DUP_ENTRY' || msg.includes('Duplicate entry')) {
          // Detectar qual campo conflitou, quando possível
          const field = msg.includes("users.username") ? 'username' : (msg.includes("users.email") ? 'email' : 'campo único');
          return res.status(409).json({ message: `Já existe um usuário com este ${field}.` });
        }
        throw dbErr;
      }

      console.log("[POST /api/auth/register] Transação concluída. Usuário e dados iniciais criados.");

      console.log("[POST /api/auth/register] Criando token JWT...");
      const token = createJWT(newUser);
      console.log("[POST /api/auth/register] Token JWT criado.");

      res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, username: newUser.username } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.flatten().fieldErrors });
      }
      const err: any = error;
      const msg = String(err?.message || '');
      const code = err?.code;
      // Tratamento adicional para duplicidade que não foi interceptada acima
      if (code === 'ER_DUP_ENTRY' || msg.includes('Duplicate entry')) {
        const field = msg.includes("users.username") ? 'username' : (msg.includes("users.email") ? 'email' : 'campo único');
        return res.status(409).json({ message: `Já existe um usuário com este ${field}.` });
      }
      console.error("[Register Route] Error (outermost):", {
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        sqlMessage: err?.sqlMessage,
        sql: err?.sql,
        message: err?.message,
        stack: err?.stack,
      });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas." });
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciais inválidas." });
      }

      const token = createJWT(user);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, username: user.username } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.flatten().fieldErrors });
      }
      const err = error as Error;
      console.error('[POST /api/auth/login] Erro:', err.message, err.stack);
      res.status(500).json({ message: "Falha ao fazer login." });
    }
  });

  // Retorna o usuário autenticado a partir do JWT
  app.get('/api/auth/me', protect, async (req, res) => {
    try {
      const authUser = (req as any).user as { id: number };
      const user = await storage.getUser(authUser.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ user: { id: user.id, name: user.name, email: user.email, username: user.username } });
    } catch (err) {
      console.error('[/api/auth/me] error:', (err as Error).message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Forgot Password (stub)
  const forgotSchema = z.object({
    email: z.string().email({ message: "Email inválido" })
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotSchema.parse(req.body);
      // Log de auditoria simples (não vazar se e-mail existe)
      console.log(`[POST /api/auth/forgot-password] Solicitação recebida para: ${email}`);

      // TODO: Implementar geração de token, persistir e enviar e-mail
      // Para agora, responder de forma neutra, sempre 200
      return res.status(200).json({
        message: "Se o e-mail existir, enviaremos instruções de recuperação."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.flatten().fieldErrors });
      }
      const err = error as Error;
      console.error('[POST /api/auth/forgot-password] Erro:', err.message, err.stack);
      return res.status(200).json({
        // Mesmo em erro interno, responder neutro para não vazar informação
        message: "Se o e-mail existir, enviaremos instruções de recuperação."
      });
    }
  });


  // Rotas de inicialização/admin removidas

  // Categories routes (mantida apenas a implementação completa mais abaixo)

  // Transactions routes
  app.get("/api/transactions", protect, async (req, res) => {
    console.log("[GET /api/transactions] Início da requisição", req.query);
    try {
      const { type, startDate, endDate, upcoming } = req.query;
      let transactions;

      console.log('[GET /api/transactions] Parâmetros recebidos:', { type, startDate, endDate, upcoming });

      const userId = getUserIdFromRequest(req);
      console.log(`[GET /api/transactions] Usando ID de usuário: ${userId}`);
      
      if (upcoming) {
        const days = parseInt(upcoming as string) || 7;
        transactions = await storage.getUpcomingTransactions(userId, days);
      } else if (startDate && endDate) {
        transactions = await storage.getTransactionsByDateRange(userId, new Date(startDate as string), new Date(endDate as string));
      } else if (type) {
        // Garantir que o tipo seja uma string válida
        const transactionType = type as string;
        console.log(`[GET /api/transactions] Buscando transações do tipo: ${transactionType}`);
        transactions = await storage.getTransactionsByType(userId, transactionType);
      } else {
        transactions = await storage.getTransactions(userId);
      }

      console.log(`[GET /api/transactions] Retornando ${transactions.length} transações`);
      // Exemplo: logar os primeiros 2 itens para debug rápido
      if (transactions.length > 0) {
        console.log('[GET /api/transactions] Exemplo de transação:', JSON.stringify(transactions[0], null, 2));
      }
      res.json(transactions);
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/transactions] Erro ao buscar transações:', err.message, err.stack);
      console.log(`[GET /api/transactions] Fim da requisição com erro`);
      res.status(500).json({ 
        message: "Failed to fetch transactions",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.post("/api/transactions", protect, async (req, res) => {
    console.log("[POST /api/transactions] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId: userId
      });
      console.log(`[POST /api/transactions] Usando ID de usuário: ${userId}`);
      
      const transaction = await storage.createTransaction(validatedData);
      console.log(`[POST /api/transactions] Transação criada com sucesso (id=${transaction.id})`);
      console.log("[POST /api/transactions] Fim da requisição");
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[POST /api/transactions] Fim da requisição com erro de validação");
        res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      } else {
        const err = error as Error;
        console.error('[POST /api/transactions] Erro ao criar transação:', err.message);
        console.log("[POST /api/transactions] Fim da requisição com erro");
        res.status(500).json({ 
          message: "Failed to create transaction",
          error: process.env.NODE_ENV === 'development' ? (err.message || 'unknown') : undefined
        });
      }
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    console.log(`[PUT /api/transactions/${req.params.id}] Início da requisição`);
    console.log(`[PUT /api/transactions/${req.params.id}] Received body:`, JSON.stringify(req.body, null, 2));
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[PUT /api/transactions/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid transaction ID format" });
      }

      const validatedData = updateTransactionSchema.parse(req.body);
      console.log(`[PUT /api/transactions/${req.params.id}] Validated data:`, JSON.stringify(validatedData, null, 2));

      const transaction = await storage.updateTransaction(id, validatedData);
      
      if (!transaction) {
        console.log(`[PUT /api/transactions/${req.params.id}] Transaction with ID ${id} not found for update.`);
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      console.log(`[PUT /api/transactions/${req.params.id}] Transação atualizada com sucesso: ${transaction}`);
      console.log(`[PUT /api/transactions/${req.params.id}] Fim da requisição`);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`[PUT /api/transactions/${req.params.id}] Zod validation error:`, JSON.stringify(error.errors, null, 2));
        console.log(`[PUT /api/transactions/${req.params.id}] Fim da requisição com erro de validação`);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        const err = error as Error;
        console.error(`[PUT /api/transactions/${req.params.id}] Error updating transaction:`, err.message, err.stack);
        console.log(`[PUT /api/transactions/${req.params.id}] Fim da requisição com erro`);
        res.status(500).json({ 
          message: "Failed to update transaction",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    console.log(`[DELETE /api/transactions/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTransaction(id);
      
      if (!success) {
        console.log(`[DELETE /api/transactions/${req.params.id}] Transação com ID ${id} não encontrada para exclusão.`);
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      console.log(`[DELETE /api/transactions/${req.params.id}] Transação excluída com sucesso.`);
      console.log(`[DELETE /api/transactions/${req.params.id}] Fim da requisição`);
      res.json({ success: true });
    } catch (error) {
      console.log(`[DELETE /api/transactions/${req.params.id}] Fim da requisição com erro`);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Goals routes
  app.get("/api/goals", protect, async (req, res) => {
    console.log("[GET /api/goals] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      console.log(`[GET /api/goals] Fetching goals for user ID: ${userId}`);
      const goals = await storage.getGoals(userId);
      console.log(`[GET /api/goals] Successfully fetched ${goals.length} goals`);
      console.log(`[GET /api/goals] Fim da requisição`);
      if (goals.length > 0) {
        console.log('[GET /api/goals] Exemplo de meta:', JSON.stringify(goals[0], null, 2));
      }
      res.json(goals);
    } catch (error) {
      const err = error as Error;
      console.error(`[GET /api/goals] Error fetching goals:`, err.message, err.stack);
      console.log(`[GET /api/goals] Fim da requisição com erro`);
      res.status(500).json({ 
        message: "Failed to fetch goals",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.post("/api/goals", protect, async (req, res) => {
    console.log("[POST /api/goals] Início da requisição");
    console.log(`[POST /api/goals] Received body:`, JSON.stringify(req.body, null, 2));
    try {
      const userId = getUserIdFromRequest(req);
      const validatedData = insertGoalSchema.parse({
        ...req.body,
        userId: userId
      });
      console.log(`[POST /api/goals] Usando ID de usuário: ${userId}`);
      console.log(`[POST /api/goals] Validated data:`, JSON.stringify(validatedData, null, 2));

      const goal = await storage.createGoal(validatedData);
      console.log(`[POST /api/goals] Meta criada com sucesso: ${goal}`);
      console.log("[POST /api/goals] Fim da requisição");
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`[POST /api/goals] Zod validation error:`, JSON.stringify(error.errors, null, 2));
        console.log("[POST /api/goals] Fim da requisição com erro de validação");
        res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      } else {
        const err = error as Error;
        console.error('[POST /api/goals] Error creating goal:', err.message, err.stack);
        console.log("[POST /api/goals] Fim da requisição com erro");
        res.status(500).json({ 
          message: "Failed to create goal",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    console.log(`[PUT /api/goals/${req.params.id}] Início da requisição`);
    console.log(`[PUT /api/goals/${req.params.id}] Received body:`, JSON.stringify(req.body, null, 2));
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[PUT /api/goals/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid goal ID format" });
      }

      const validatedData = insertGoalSchema.partial().parse(req.body);
      console.log(`[PUT /api/goals/${req.params.id}] Validated data:`, JSON.stringify(validatedData, null, 2));

      const goal = await storage.updateGoal(id, validatedData);
      
      if (!goal) {
        console.log(`[PUT /api/goals/${req.params.id}] Goal with ID ${id} not found for update.`);
        return res.status(404).json({ message: "Goal not found" });
      }
      
      console.log(`[PUT /api/goals/${req.params.id}] Meta atualizada com sucesso: ${goal}`);
      console.log(`[PUT /api/goals/${req.params.id}] Fim da requisição`);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`[PUT /api/goals/${req.params.id}] Zod validation error:`, JSON.stringify(error.errors, null, 2));
        console.log(`[PUT /api/goals/${req.params.id}] Fim da requisição com erro de validação`);
        res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      } else {
        const err = error as Error;
        console.error(`[PUT /api/goals/${req.params.id}] Error updating goal:`, err.message, err.stack);
        console.log(`[PUT /api/goals/${req.params.id}] Fim da requisição com erro`);
        res.status(500).json({ 
          message: "Failed to update goal",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    console.log(`[DELETE /api/goals/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGoal(id);
      
      if (!success) {
        console.log(`[DELETE /api/goals/${req.params.id}] Meta com ID ${id} não encontrada para exclusão.`);
        return res.status(404).json({ message: "Goal not found" });
      }
      
      console.log(`[DELETE /api/goals/${req.params.id}] Meta excluída com sucesso.`);
      console.log(`[DELETE /api/goals/${req.params.id}] Fim da requisição`);
      res.json({ success: true });
    } catch (error) {
      console.log(`[DELETE /api/goals/${req.params.id}] Fim da requisição com erro`);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Investments routes
  app.get("/api/investments", protect, async (req, res) => {
    console.log("[GET /api/investments] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      console.log(`[GET /api/investments] Fetching investments for user ID: ${userId}`);
      const investments = await storage.getInvestments(userId);
      console.log(`[GET /api/investments] Retornando ${investments.length} investimentos`);
      console.log(`[GET /api/investments] Fim da requisição`);
      if (investments.length > 0) {
        console.log('[GET /api/investments] Exemplo de investimento:', JSON.stringify(investments[0], null, 2));
      }
      res.json(investments);
    } catch (error) {
      console.log(`[GET /api/investments] Fim da requisição com erro`);
      res.status(500).json({ message: "Failed to fetch investments" });
    }
  });

  app.post("/api/investments", protect, async (req, res) => {
    console.log("[POST /api/investments] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      const validatedData = insertInvestmentSchema.parse({
        ...req.body,
        userId: userId
      });
      console.log(`[POST /api/investments] Usando ID de usuário: ${userId}`);
      
      const investment = await storage.createInvestment(validatedData);
      console.log(`[POST /api/investments] Investimento criado com sucesso: ${investment}`);
      console.log("[POST /api/investments] Fim da requisição");
      res.json(investment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[POST /api/investments] Fim da requisição com erro de validação");
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.log("[POST /api/investments] Fim da requisição com erro");
        res.status(500).json({ message: "Failed to create investment" });
      }
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    console.log(`[DELETE /api/investments/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[DELETE /api/investments/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid investment ID format" });
      }

      const success = await storage.deleteInvestment(id); 
      
      if (!success) {
        console.log(`[DELETE /api/investments/${req.params.id}] Investimento com ID ${id} não encontrado ou falha ao excluir.`);
        return res.status(404).json({ message: "Investment not found or could not be deleted" });
      }
      
      console.log(`[DELETE /api/investments/${req.params.id}] Investimento excluído com sucesso.`);
      console.log(`[DELETE /api/investments/${req.params.id}] Fim da requisição`);
      res.status(200).json({ success: true, message: "Investment deleted successfully" });
    } catch (error) {
      console.log(`[DELETE /api/investments/${req.params.id}] Fim da requisição com erro`);
      const err = error as Error;
      res.status(500).json({ 
        message: "Failed to delete investment",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });


  app.put("/api/investments/:id", async (req, res) => {
    console.log(`[PUT /api/investments/${req.params.id}] Início da requisição`);
    console.log(`[PUT /api/investments/${req.params.id}] Received body:`, JSON.stringify(req.body, null, 2));
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[PUT /api/investments/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid investment ID format" });
      }

      const validatedData = updateInvestmentSchema.parse(req.body);
      console.log(`[PUT /api/investments/${req.params.id}] Validated data:`, JSON.stringify(validatedData, null, 2));
      
      const updatedInvestment = await storage.updateInvestment(id, validatedData);

      if (!updatedInvestment) {
        console.log(`[PUT /api/investments/${req.params.id}] Investment with ID ${id} not found for update.`);
        return res.status(404).json({ message: "Investment not found" });
      }

      console.log(`[PUT /api/investments/${req.params.id}] Investimento atualizado com sucesso: ${updatedInvestment}`);
      console.log(`[PUT /api/investments/${req.params.id}] Fim da requisição`);
      res.status(200).json(updatedInvestment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`[PUT /api/investments/${req.params.id}] Zod validation error:`, JSON.stringify(error.errors, null, 2));
        console.log(`[PUT /api/investments/${req.params.id}] Fim da requisição com erro de validação`);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.log(`[PUT /api/investments/${req.params.id}] Fim da requisição com erro`);
        const err = error as Error;
        res.status(500).json({ 
          message: "Failed to update investment",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  // Alerts routes
  app.get("/api/alerts", protect, async (req, res) => {
    console.log("[GET /api/alerts] Início da requisição");
    try {
      const unreadOnly = req.query.unread === 'true';
      let alerts;
      
      const userId = getUserIdFromRequest(req);
      if (unreadOnly) {
        alerts = await storage.getUnreadAlerts(userId);
      } else {
        alerts = await storage.getAlerts(userId);
      }
      
      console.log(`[GET /api/alerts] Retornando ${alerts.length} alertas`);
      console.log(`[GET /api/alerts] Fim da requisição`);
      for (const alert of alerts) {
        if (alert.referenceType === 'transaction' && alert.referenceId !== null) {
          const transaction = await storage.getTransactionById(alert.referenceId);
          if (transaction && transaction.dueDate) {
            // A mensagem do alerta já é definida em storage.ts e inclui a descrição.
            // A linha abaixo foi removida para evitar sobrescrever a mensagem detalhada:
            // alert.message = formatRelativeDueDate(transaction.dueDate);
          }
        }
      }
      
      res.json(alerts);
    } catch (error) {
      console.log(`[GET /api/alerts] Fim da requisição com erro`);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", protect, async (req, res) => {
    console.log("[POST /api/alerts] Início da requisição");
    try {
      const userId = getUserIdFromRequest(req);
      console.log(`[POST /api/alerts] Usando ID de usuário: ${userId}`);
      
      const validatedData = insertAlertSchema.parse({
        ...req.body,
        userId: userId
      });
      const alert = await storage.createAlert(validatedData);
      console.log(`[POST /api/alerts] Alerta criado com sucesso: ${alert}`);
      console.log("[POST /api/alerts] Fim da requisição");
      res.json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[POST /api/alerts] Fim da requisição com erro de validação");
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.log("[POST /api/alerts] Fim da requisição com erro");
        res.status(500).json({ message: "Failed to create alert" });
      }
    }
  });

  app.put("/api/alerts/:id/read", protect, async (req, res) => {
    console.log(`[PUT /api/alerts/${req.params.id}/read] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markAlertAsRead(id);
      
      if (!success) {
        console.log(`[PUT /api/alerts/${req.params.id}/read] Alerta com ID ${id} não encontrado.`);
        return res.status(404).json({ message: "Alert not found" });
      }
      
      console.log(`[PUT /api/alerts/${req.params.id}/read] Alerta marcado como lido com sucesso.`);
      console.log(`[PUT /api/alerts/${req.params.id}/read] Fim da requisição`);
      res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      console.log(`[PUT /api/alerts/${req.params.id}/read] Fim da requisição com erro`);
      res.status(500).json({ 
        message: "Failed to mark alert as read", 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.delete("/api/alerts/:id", protect, async (req, res) => {
    console.log(`[DELETE /api/alerts/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[DELETE /api/alerts/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid alert ID format" });
      }

      const success = await storage.deleteAlert(id);

      if (!success) {
        console.log(`[DELETE /api/alerts/${req.params.id}] Alerta com ID ${id} não encontrado ou falha ao excluir.`);
        return res.status(404).json({ message: "Alert not found or could not be deleted" });
      }

      console.log(`[DELETE /api/alerts/${req.params.id}] Alerta excluído com sucesso.`);
      console.log(`[DELETE /api/alerts/${req.params.id}] Fim da requisição`);
      res.status(200).json({ success: true, message: "Alert deleted successfully" });
    } catch (error) {
      console.log(`[DELETE /api/alerts/${req.params.id}] Fim da requisição com erro`);
      const err = error as Error;
      res.status(500).json({ 
        message: "Failed to delete alert", 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Dashboard summary route
  // Nova rota para fornecer dados para os gráficos do dashboard
  app.get("/api/reports/charts", protect, async (req, res) => {
    console.log('[GET /api/reports/charts] Attempting to fetch chart data.');
    try {
      console.log('[GET /api/reports/charts] Request headers:', req.headers);
      console.log('[GET /api/reports/charts] Request query:', req.query);
      
      const userId = getUserIdFromRequest(req);
      console.log(`[GET /api/reports/charts] Usando ID de usuário: ${userId}`);
      
      // Obter todas as transações do usuário
      const allTransactions = await storage.getTransactions(userId);
      console.log(`[GET /api/reports/charts] Fetched ${allTransactions.length} transactions.`);
      console.log('[GET /api/reports/charts] First transaction sample:', allTransactions.length > 0 ? JSON.stringify(allTransactions[0]) : 'No transactions');
      
      // Obter todas as categorias
      const userIdForCategories = getUserIdFromRequest(req);
      const allCategories = await storage.getCategories(userIdForCategories);
      console.log(`[GET /api/reports/charts] Fetched ${allCategories.length} categories.`);
      console.log('[GET /api/reports/charts] First category sample:', allCategories.length > 0 ? JSON.stringify(allCategories[0]) : 'No categories');
      
      // Se não houver transações, retornar dados vazios
      if (allTransactions.length === 0) {
        console.log('[GET /api/reports/charts] No transactions found. Returning empty data.');
        return res.json({
          expensesByCategory: [],
          balanceEvolution: [],
          hasData: false
        });
      }
      
      // Calcular despesas por categoria
      const expenseCategories = allCategories.filter(c => c.type === 'expense');
      const expensesByCategory = expenseCategories.map(category => {
        const categoryTransactions = allTransactions.filter(t => 
          t.categoryId === category.id && 
          t.type === 'expense' && 
          t.status === 'paid'
        );
        const total = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        return {
          name: category.name,
          value: total,
          color: category.color || '#' + Math.floor(Math.random()*16777215).toString(16) // Gerar cor aleatória se não houver
        };
      }).filter(item => item.value > 0);
      
      // Gerar dados de evolução do saldo por mês
      const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      
      // Agrupar transações por mês
      const transactionsByMonth: Record<number, any[]> = {};
      const currentYear = new Date().getFullYear();
      
      allTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        if (transactionDate.getFullYear() === currentYear) {
          const month = transactionDate.getMonth();
          if (!transactionsByMonth[month]) {
            transactionsByMonth[month] = [];
          }
          transactionsByMonth[month].push(transaction);
        }
      });
      
      // Calcular saldo acumulado por mês
      let accumulatedBalance = 0;
      const balanceEvolution = months.map((month, index) => {
        const monthTransactions = transactionsByMonth[index] || [];
        
        const monthlyIncome = monthTransactions
          .filter((t: any) => t.type === 'income' && t.status === 'received')
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
        const monthlyExpenses = monthTransactions
          .filter((t: any) => t.type === 'expense' && t.status === 'paid')
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
        
        accumulatedBalance += (monthlyIncome - monthlyExpenses);
        
        return {
          month,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          balance: accumulatedBalance
        };
      });
      
      const chartData = {
        expensesByCategory,
        balanceEvolution,
        hasData: true
      };
      
      console.log('[GET /api/reports/charts] Successfully prepared chart data');
      res.json(chartData);
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/reports/charts] Error fetching chart data:', err);
      console.error('Error details:', err.message);
      console.error('Stack trace:', err.stack);
      
      res.status(500).json({ 
        message: "Failed to fetch chart data",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        hasData: false
      });
    }
  });

  // Entradas por categoria (suporta ?limit=<n> para Top N)
  app.get("/api/reports/top-income-by-category", protect, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      const limitParam = parseInt((req.query?.limit as string) || "");
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
      const [allTransactions, allCategories] = await Promise.all([
        storage.getTransactions(userId),
        storage.getCategories(userId),
      ]);

      if (!allTransactions || allTransactions.length === 0) {
        return res.json({ items: [], hasData: false });
      }

      const incomeCategories = allCategories.filter((c: any) => c.type === 'income');
      let items = incomeCategories
        .map((category: any) => {
          const categoryTransactions = allTransactions.filter((t: any) =>
            t.categoryId === category.id && t.type === 'income' && t.status === 'received'
          );
          const total = categoryTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          return {
            name: category.name,
            value: total,
            color: category.color || '#' + Math.floor(Math.random() * 16777215).toString(16),
          };
        })
        .sort((a: any, b: any) => b.value - a.value);
      if (limit) {
        items = items.slice(0, limit);
      }

      return res.json({ items, hasData: items.length > 0 });
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/reports/top-income-by-category] Error:', err.message);
      return res.status(500).json({ message: 'Failed to fetch top income categories' });
    }
  });

  app.get("/api/dashboard/summary", protect, async (req, res) => {
    console.log('[GET /api/dashboard/summary] Attempting to fetch dashboard summary data.');
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = `${currentMonth}-31`;
      console.log(`[GET /api/dashboard/summary] Date range for monthly transactions: ${startOfMonth} to ${endOfMonth}`);

      const userId = getUserIdFromRequest(req);
      console.log(`[GET /api/dashboard/summary] Usando ID de usuário: ${userId}`);
      
      console.log('[GET /api/dashboard/summary] Fetching monthly transactions...');
      const monthlyTransactions = await storage.getTransactionsByDateRange(userId, new Date(startOfMonth), new Date(endOfMonth));
      console.log(`[GET /api/dashboard/summary] Fetched ${monthlyTransactions.length} monthly transactions.`);

      console.log('[GET /api/dashboard/summary] Fetching all transactions...');
      const allTransactions = await storage.getTransactions(userId);
      console.log(`[GET /api/dashboard/summary] Fetched ${allTransactions.length} total transactions.`);

      console.log('[GET /api/dashboard/summary] Fetching goals...');
      const goals = await storage.getGoals(userId);
      console.log(`[GET /api/dashboard/summary] Fetched ${goals.length} goals.`);

      console.log('[GET /api/dashboard/summary] Fetching investments...');
      const investments = await storage.getInvestments(userId) || [];
      console.log(`[GET /api/investments] Retornando ${investments.length} investimentos`);
      console.log(`[GET /api/dashboard/summary] Fetched ${investments.length} investments.`);

      // Verificar se há transações antes de calcular
      if (allTransactions.length === 0) {
        console.log('[GET /api/dashboard/summary] Nenhuma transação encontrada. Retornando dados vazios.');
        const emptySummaryData = {
          currentBalance: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          totalInvestments: investments.length > 0 ? investments.reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0) : 0,
          goalsCount: goals.length,
          transactionsCount: 0,
          hasTransactions: false
        };
        return res.json(emptySummaryData);
      }

      console.log('[GET /api/dashboard/summary] Calculating monthly income and expenses...');
      // Usar todas as transações em vez de apenas as do mês atual
      const monthlyIncome = allTransactions.length > 0 ?
        allTransactions
          .filter((t: any) => t.type === 'income') // Incluir todas as receitas, independente do status
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
        : 0;
      console.log(`[GET /api/dashboard/summary] Calculated monthly income: ${monthlyIncome}`);

      // Usar todas as transações em vez de apenas as do mês atual
      const monthlyExpenses = allTransactions.length > 0 ?
        allTransactions
          .filter((t: any) => t.type === 'expense') // Incluir todas as despesas, independente do status
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
        : 0;
      console.log(`[GET /api/dashboard/summary] Calculated monthly expenses: ${monthlyExpenses}`);

      console.log('[GET /api/dashboard/summary] Calculating current balance...');
      // Usar as mesmas receitas e despesas já calculadas
      const totalIncome = monthlyIncome; // Usando o valor já calculado que inclui todas as receitas
      const totalExpenses = monthlyExpenses; // Usando o valor já calculado que inclui todas as despesas
      const currentBalance = totalIncome - totalExpenses;
      console.log(`[GET /api/dashboard/summary] Calculated current balance: ${currentBalance}`);

      console.log('[GET /api/dashboard/summary] Calculating total investments...');
      const totalInvestments = investments.length > 0 ?
        investments.reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0)
        : 0;
      console.log(`[GET /api/dashboard/summary] Calculated total investments: ${totalInvestments}`);

      const summaryData = {
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        totalInvestments,
        goalsCount: goals.length,
        transactionsCount: allTransactions.length,
        hasTransactions: allTransactions.length > 0
      };
      console.log('[GET /api/dashboard/summary] Successfully prepared summary data:', JSON.stringify(summaryData, null, 2));
      res.json(summaryData);
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/dashboard/summary] Error fetching dashboard summary:', err);
      console.error('Error details:', err.message);
      console.error('Stack trace:', err.stack);
      
      // Log more detailed information about the error
      if (error instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error cause:', err.cause);
      }
      
      // Retornar um objeto vazio com mensagem de erro em caso de falha
      res.status(500).json({ 
        message: "Failed to fetch dashboard summary",
        currentBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        totalInvestments: 0,
        goalsCount: 0,
        transactionsCount: 0,
        hasTransactions: false,
        errorOccurred: true,
        errorDetails: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // Categories routes
  app.get("/api/categories", protect, async (req, res) => {
    console.log("[GET /api/categories] Início da requisição (autenticado)");
    // Evitar problemas de cache quando o header Authorization muda
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Authorization');
    try {
      const type = req.query.type as string;
      let categoriesResult;
      
      if (type) {
        console.log(`[GET /api/categories] Buscando categorias do tipo: ${type}`);
        const userIdForType = getUserIdFromRequest(req);
        categoriesResult = await storage.getCategoriesByType(userIdForType, type);
        // Auto-provisionamento quando vazio para tipo específico
        if (!categoriesResult || categoriesResult.length === 0) {
          console.log(`[GET /api/categories] Nenhuma categoria do tipo ${type} encontrada para o usuário ${userIdForType}. Criando categorias padrão...`);
          const defaults = await storage.getDefaultCategories();
          const toCreate = defaults
            .filter((c) => c.type === type)
            .map((cat) => ({
              name: cat.name,
              type: cat.type,
              icon: (cat as any).icon,
              color: (cat as any).color,
              userId: userIdForType,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          if (toCreate.length > 0) {
            await storage.createManyCategories(toCreate as any);
            categoriesResult = await storage.getCategoriesByType(userIdForType, type);
          }
        } else {
          // Completar categorias ausentes em relação ao conjunto padrão
          const defaults = await storage.getDefaultCategories();
          const defaultForType = defaults.filter((c) => c.type === type);
          const existingNames = new Set((categoriesResult as any[]).map((c) => c.name));
          const missing = defaultForType.filter((d) => !existingNames.has(d.name));
          if (missing.length > 0) {
            console.log(`[GET /api/categories] Faltam ${missing.length} categorias padrão do tipo ${type} para o usuário ${userIdForType}. Criando as ausentes...`);
            await storage.createManyCategories(
              missing.map((cat) => ({
                name: cat.name,
                type: cat.type,
                icon: (cat as any).icon,
                color: (cat as any).color,
                userId: userIdForType,
                createdAt: new Date(),
                updatedAt: new Date(),
              })) as any
            );
            categoriesResult = await storage.getCategoriesByType(userIdForType, type);
          }
        }
      } else {
        console.log(`[GET /api/categories] Buscando todas as categorias`);
        const userIdForAll = getUserIdFromRequest(req);
        categoriesResult = await storage.getCategories(userIdForAll);
        // Auto-provisionamento quando vazio (todas as categorias)
        if (!categoriesResult || categoriesResult.length === 0) {
          console.log(`[GET /api/categories] Nenhuma categoria encontrada para o usuário ${userIdForAll}. Criando categorias padrão...`);
          const defaults = await storage.getDefaultCategories();
          const toCreate = defaults.map((cat) => ({
            name: cat.name,
            type: cat.type,
            icon: (cat as any).icon,
            color: (cat as any).color,
            userId: userIdForAll,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          if (toCreate.length > 0) {
            await storage.createManyCategories(toCreate as any);
            categoriesResult = await storage.getCategories(userIdForAll);
          }
        }
      }
      
      console.log(`[GET /api/categories] Retornando ${categoriesResult.length} categorias`);
      console.log(`[GET /api/categories] Fim da requisição`);
      res.json(categoriesResult);
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/categories] Erro ao buscar categorias:', err.message, err.stack);
      console.log(`[GET /api/categories] Fim da requisição com erro`);
      res.status(500).json({ 
        message: "Failed to fetch categories",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.post("/api/categories", async (req, res) => {
    console.log("[POST /api/categories] Início da requisição");
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      
      // Adicionar campos de data automaticamente
      const categoryData = {
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`[POST /api/categories] Dados da categoria a ser criada: ${JSON.stringify(categoryData)}`);
      const category = await storage.createCategory(categoryData);
      console.log(`[POST /api/categories] Categoria criada com sucesso: ${JSON.stringify(category)}`);
      console.log("[POST /api/categories] Fim da requisição");
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[POST /api/categories] Fim da requisição com erro de validação");
        res.status(400).json({ 
          message: "Failed to create category", 
          errors: error.errors 
        });
      } else {
        const err = error as Error;
        console.error('[POST /api/categories] Erro ao criar categoria:', err.message, err.stack);
        console.log("[POST /api/categories] Fim da requisição com erro");
        res.status(500).json({ 
          message: "Failed to create category",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    console.log(`[PUT /api/categories/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[PUT /api/categories/${req.params.id}] Invalid ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid category ID format" });
      }

      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      
      if (!category) {
        console.log(`[PUT /api/categories/${req.params.id}] Category with ID ${id} not found for update.`);
        return res.status(404).json({ message: "Category not found" });
      }
      
      console.log(`[PUT /api/categories/${req.params.id}] Categoria atualizada com sucesso: ${JSON.stringify(category)}`);
      console.log(`[PUT /api/categories/${req.params.id}] Fim da requisição`);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`[PUT /api/categories/${req.params.id}] Fim da requisição com erro de validação`);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        const err = error as Error;
        console.error(`[PUT /api/categories/${req.params.id}] Error updating category:`, err.message, err.stack);
        console.log(`[PUT /api/categories/${req.params.id}] Fim da requisição com erro`);
        res.status(500).json({ 
          message: "Failed to update category",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    console.log(`[DELETE /api/categories/${req.params.id}] Início da requisição`);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategory(id);
      
      if (!success) {
        console.log(`[DELETE /api/categories/${req.params.id}] Categoria com ID ${id} não encontrada para exclusão.`);
        return res.status(404).json({ message: "Category not found" });
      }
      
      console.log(`[DELETE /api/categories/${req.params.id}] Categoria excluída com sucesso.`);
      console.log(`[DELETE /api/categories/${req.params.id}] Fim da requisição`);
      res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      console.log(`[DELETE /api/categories/${req.params.id}] Fim da requisição com erro`);
      res.status(500).json({ 
        message: "Failed to delete category",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // User Preferences routes
  app.get("/api/user/preferences", protect, async (req, res) => {
    console.log("[GET /api/user/preferences] Início da requisição");
    try {
      // Em uma aplicação real, obter o ID do usuário do token JWT
      // Para este exemplo, estamos usando o DEMO_USER_ID
      const userId = DEMO_USER_ID;
      
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        console.log(`[GET /api/user/preferences] Preferências não encontradas para o usuário ${userId}, criando padrões`);
        // Se não existirem preferências, criar com valores padrão
        const defaultPreferences = await storage.createOrUpdateUserPreferences(userId, {
          language: "pt-BR",
          theme: "light",
          currency: "BRL",
          dateFormat: "DD/MM/YYYY"
        });
        
        console.log(`[GET /api/user/preferences] Preferências padrão criadas: ${JSON.stringify(defaultPreferences)}`);
        console.log("[GET /api/user/preferences] Fim da requisição");
        return res.json(defaultPreferences);
      }
      
      console.log(`[GET /api/user/preferences] Preferências encontradas: ${JSON.stringify(preferences)}`);
      console.log("[GET /api/user/preferences] Fim da requisição");
      res.json(preferences);
    } catch (error) {
      const err = error as Error;
      console.error('[GET /api/user/preferences] Erro:', err.message, err.stack);
      console.log("[GET /api/user/preferences] Fim da requisição com erro");
      res.status(500).json({ 
        message: "Falha ao buscar preferências do usuário",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.put("/api/user/preferences", protect, async (req, res) => {
    console.log("[PUT /api/user/preferences] Início da requisição");
    try {
      // Em uma aplicação real, obter o ID do usuário do token JWT
      // Para este exemplo, estamos usando o DEMO_USER_ID
      const userId = DEMO_USER_ID;
      
      const validatedData = updateUserPreferencesSchema.parse(req.body);
      console.log(`[PUT /api/user/preferences] Dados validados: ${JSON.stringify(validatedData)}`);
      
      const updatedPreferences = await storage.createOrUpdateUserPreferences(userId, validatedData);
      
      console.log(`[PUT /api/user/preferences] Preferências atualizadas: ${JSON.stringify(updatedPreferences)}`);
      console.log("[PUT /api/user/preferences] Fim da requisição");
      res.json(updatedPreferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[PUT /api/user/preferences] Erro de validação");
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.flatten().fieldErrors 
        });
      } else {
        const err = error as Error;
        console.error('[PUT /api/user/preferences] Erro:', err.message, err.stack);
        console.log("[PUT /api/user/preferences] Fim da requisição com erro");
        res.status(500).json({ 
          message: "Falha ao atualizar preferências do usuário",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
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
