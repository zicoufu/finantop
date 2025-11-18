import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Configuração base
const config = {
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "client", "index.html"),
      },
    },
  },
  server: {
    port: 3002,
    host: '0.0.0.0',
    strictPort: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy: any, _options: any): void => {
          proxy.on('error', (err: Error, _req: any, _res: any): void => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any): void => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes: any, req: any, _res: any): void => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
    },
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname, 'client'),
        path.resolve(import.meta.dirname, 'shared')
      ]
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
};

export default defineConfig(config);
