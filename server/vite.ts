import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Configuração do servidor Vite
  const serverOptions = {
    // Habilita o modo middleware
    middlewareMode: true,
    // Configura o servidor
    server: {
      // Habilita CORS
      cors: true,
      // Configura o host
      host: '0.0.0.0',
      // Configura o HMR
      hmr: {
        protocol: 'ws',
        host: 'localhost'
        // port and clientPort removed to allow Vite to use the main server for HMR
        // when in middlewareMode and hmr.server is specified.
      }
    },
    // Configuração de CORS para o servidor de desenvolvimento
    cors: {
      origin: '*',
      credentials: true
    }
  };

  const vite = await createViteServer({
    // ...viteConfig,
    configFile: false,
    root: path.resolve(import.meta.dirname, "..", "client"),
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '..', 'client', 'src'),
        '@shared': path.resolve(import.meta.dirname, '..', 'shared'),
      },
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // process.exit(1); // Comentado para evitar encerramento abrupto por erros do Vite
      },
    },
    server: {
      ...serverOptions.server, // Spreads { cors, host, hmr: { protocol, host, port, clientPort } }
      middlewareMode: true,   // Ensures middlewareMode is true
      hmr: {
        ...serverOptions.server.hmr, // Spreads { protocol, host, port, clientPort } again
        server: server // <--- Key change: Use the main HTTP server for HMR
      }
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  // SPA fallback: somente para GET e não-API, evitando path pattern '*'
  app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();

    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic() {
  const router = express.Router();
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  router.use(express.static(distPath));

  // Fallback to index.html for SPA routing
  router.get('/*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return router;
}
